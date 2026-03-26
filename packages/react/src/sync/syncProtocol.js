"use client"
import { Dexie } from "dexie";
import { log } from "../config";
import { getTokenGetter } from "./tokenRegistry";

function decodeJwtExp(token) {
  try {
    var parts = token.split(".");
    if (parts.length !== 3) return null;
    var payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
    return typeof payload.exp === "number" ? payload.exp : null;
  } catch (_) {
    return null;
  }
}

export const syncProtocol = function () {
  log("Initializing syncProtocol");
  // Constants:
  var RECONNECT_DELAY = 5000; // Reconnect delay in case of errors such as network down.
  var TOKEN_REFRESH_BUFFER = 60; // Refresh token this many seconds before exp

  Dexie.Syncable.registerSyncProtocol("websocket", {
    sync: function (
      context,
      url,
      options,
      baseRevision,
      syncedRevision,
      changes,
      partial,
      applyRemoteChanges,
      onChangesAccepted,
      onSuccess,
      onError,
    ) {
      // The following vars are needed because we must know which callback to ack when server sends it's ack to us.
      var requestId = 0;
      var acceptCallbacks = {};
      var refreshTimer = null;

      // Connect the WebSocket to given url:
      log("Connecting to", url)
      var ws = new WebSocket(url);

      // sendChanges() method:
      function sendChanges(changes, baseRevision, partial, onChangesAccepted) {
        log("sendChanges", changes.length, baseRevision);
        ++requestId;
        acceptCallbacks[requestId.toString()] = onChangesAccepted;

        // In this example, the server expects the following JSON format of the request:
        //  {
        //      type: "changes"
        //      baseRevision: baseRevision,
        //      changes: changes,
        //      partial: partial,
        //      requestId: id
        //  }
        //  To make the sample simplified, we assume the server has the exact same specification of how changes are structured.
        //  In real world, you would have to pre-process the changes array to fit the server specification.
        //  However, this example shows how to deal with the WebSocket to fullfill the API.

        ws.send(
          JSON.stringify({
            type: "changes",
            changes: changes,
            partial: partial,
            baseRevision: baseRevision,
            requestId: requestId,
          }),
        );
      }



      function clearRefreshTimer() {
        if (refreshTimer) {
          clearTimeout(refreshTimer);
          refreshTimer = null;
        }
      }

      // Resolve the getToken function from the module-level registry.
      // It's stored there (not in options) because dexie-syncable serializes
      // options into IndexedDB, and functions can't survive structured clone.
      function resolveGetToken() {
        var fn = getTokenGetter(url);
        if (!fn) throw new Error("No token getter registered for " + url);
        return fn;
      }

      // Schedule a proactive token refresh before the JWT expires.
      // Sends a tokenUpdate message on the existing WebSocket so the
      // server can accept the new token without dropping the connection.
      function scheduleTokenRefresh(tokenStr) {
        clearRefreshTimer();
        var exp = decodeJwtExp(tokenStr);
        if (!exp) return;
        var msUntilRefresh = (exp - TOKEN_REFRESH_BUFFER) * 1000 - Date.now();
        if (msUntilRefresh <= 0) return;
        log("Scheduling proactive token refresh in", Math.round(msUntilRefresh / 1000), "s");
        refreshTimer = setTimeout(async function () {
          try {
            var newToken = await resolveGetToken()({ forceRefresh: true });
            if (ws.readyState === WebSocket.OPEN) {
              log("Sending tokenUpdate on existing WebSocket");
              ws.send(JSON.stringify({ type: "tokenUpdate", authToken: newToken }));
              scheduleTokenRefresh(newToken);
            }
          } catch (err) {
            log("Proactive token refresh failed (non-fatal):", err);
          }
        }, msUntilRefresh);
      }

      // When WebSocket opens, get a fresh token and send our identity to the server.
      // This runs on every open, including reconnects after ERROR_WILL_RETRY,
      // so each attempt gets a fresh token via getToken().
      ws.onopen = async function (event) {
        try {
          var token = await resolveGetToken()();
          log("Opening socket - sending clientIdentity", context.clientIdentity);
          ws.send(
            JSON.stringify({
              type: "clientIdentity",
              clientIdentity: context.clientIdentity || null,
              authToken: token,
              schema: options.schema
            }),
          );
          scheduleTokenRefresh(token);
        } catch (err) {
          log("Failed to get token for WebSocket:", err);
          ws.close();
          onError("Authentication failed: " + (err.message || err), RECONNECT_DELAY);
        }
      };

      // If network down or other error, tell the framework to reconnect again in some time:
      ws.onerror = function (event) {
        clearRefreshTimer();
        ws.close();
        log("ws.onerror", event);
        onError(event?.message, RECONNECT_DELAY);
      };

      // If socket is closed (network disconnected), inform framework and make it reconnect
      ws.onclose = function (event) {
        clearRefreshTimer();
        onError("Socket closed: " + event.reason, RECONNECT_DELAY);
      };

      // isFirstRound: Will need to call onSuccess() only when we are in sync the first time.
      // onSuccess() will unblock Dexie to be used by application code.
      // If for example app code writes: db.friends.where('shoeSize').above(40).toArray(callback), the execution of that query
      // will not run until we have called onSuccess(). This is because we want application code to get results that are as
      // accurate as possible. Specifically when connected the first time and the entire DB is being synced down to the browser,
      // it is important that queries starts running first when db is in sync.
      var isFirstRound = true;
      // When message arrive from the server, deal with the message accordingly:
      ws.onmessage = function (event) {
        try {
          // Assume we have a server that should send JSON messages of the following format:
          // {
          //     type: "clientIdentity", "changes", "ack" or "error"
          //     clientIdentity: unique value for our database client node to persist in the context. (Only applicable if type="clientIdentity")
          //     message: Error message (Only applicable if type="error")
          //     requestId: ID of change request that is acked by the server (Only applicable if type="ack" or "error")
          //     changes: changes from server (Only applicable if type="changes")
          //     lastRevision: last revision of changes sent (applicable if type="changes")
          //     partial: true if server has additionalChanges to send. False if these changes were the last known. (applicable if type="changes")
          // }
          var requestFromServer = JSON.parse(event.data);
          log("requestFromServer", requestFromServer, { isFirstRound });

          if (requestFromServer.type == "clientIdentity") {
            context.clientIdentity = requestFromServer.clientIdentity;
            context.save();

            sendChanges(changes, baseRevision, partial, onChangesAccepted);

            ws.send(
              JSON.stringify({
                type: "subscribe",
                syncedRevision: syncedRevision,
              }),
            );
          } else if (requestFromServer.type == "changes") {
            applyRemoteChanges(
              requestFromServer.changes,
              requestFromServer.currentRevision,
              requestFromServer.partial,
            );
            if (isFirstRound && !requestFromServer.partial) {
              // Since this is the first sync round and server sais we've got all changes - now is the time to call onsuccess()
              onSuccess({
                // Specify a react function that will react on additional client changes
                react: function (
                  changes,
                  baseRevision,
                  partial,
                  onChangesAccepted,
                ) {
                  sendChanges(
                    changes,
                    baseRevision,
                    partial,
                    onChangesAccepted,
                  );
                },
                disconnect: function () {
                  clearRefreshTimer();
                  ws.close();
                },
              });
              isFirstRound = false;
            }
          } else if (requestFromServer.type == "ack") {
            var requestId = requestFromServer.requestId;
            var acceptCallback = acceptCallbacks[requestId.toString()];
            acceptCallback(); // Tell framework that server has acknowledged the changes sent.
            delete acceptCallbacks[requestId.toString()];
          } else if (requestFromServer.type == "error") {
            ws.close();
            if (requestFromServer.code === "TOKEN_EXPIRED" || requestFromServer.code === "UNAUTHORIZED") {
              log("Auth error from server, will reconnect with fresh token:", requestFromServer.message);
              onError(requestFromServer.message, RECONNECT_DELAY);
            } else {
              onError(requestFromServer.message, Infinity);
            }
          } else {
            log("unknown message", requestFromServer);
            ws.close();
            onError("unknown message", Infinity);
          }
        } catch (e) {
          ws.close();
          log("caught error", e)
          onError(e, Infinity); // Something went crazy. Server sends invalid format or our code is buggy. Dont reconnect - it would continue failing.
        }
      };
    },
  });
};

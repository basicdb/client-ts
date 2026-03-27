'use client'

import React, { useCallback, useMemo, useState } from 'react'
import { useBasic, DBStatus } from '../context'
import type { BasicSchemaDevInfo } from '../context'
import { version as sdkVersion } from '../../package.json'
import { isDevelopment } from '../utils/network'

const INDEXED_DB_NAME = 'basicdb'
const PANEL_PAD_X = 12

type ChipTone = 'ok' | 'warn' | 'bad' | 'muted'

function toneForAuth(isReady: boolean, isSignedIn: boolean): ChipTone {
    if (!isReady) return 'muted'
    if (isSignedIn) return 'ok'
    return 'warn'
}

function toneForDb(dbMode: string, dbStatus: DBStatus): ChipTone {
    if (dbMode === 'remote') return dbStatus === DBStatus.ONLINE ? 'ok' : 'warn'
    if (dbStatus === DBStatus.ONLINE || dbStatus === DBStatus.SYNCING) return 'ok'
    if (dbStatus === DBStatus.CONNECTING || dbStatus === DBStatus.LOADING) return 'warn'
    if (dbStatus === DBStatus.OFFLINE) return 'muted'
    return 'bad'
}

function toneForSchema(info: BasicSchemaDevInfo | null): ChipTone {
    if (!info) return 'muted'
    if (info.valid && info.status === 'current') return 'ok'
    if (info.status === 'unpublished') return 'warn'
    if (info.status === 'no_schema') return 'muted'
    return 'bad'
}

function dbStatusLabel(status: DBStatus): string {
    switch (status) {
        case DBStatus.LOADING:
            return 'Initializing'
        case DBStatus.OFFLINE:
            return 'Offline'
        case DBStatus.CONNECTING:
            return 'Connecting'
        case DBStatus.ONLINE:
            return 'Connected'
        case DBStatus.SYNCING:
            return 'Syncing'
        case DBStatus.ERROR:
            return 'Error'
        case DBStatus.ERROR_WILL_RETRY:
            return 'Retrying'
        case DBStatus.ERROR_TOKEN_EXPIRED:
            return 'Token refresh'
        default:
            return String(status)
    }
}

function chipColor(tone: ChipTone): string {
    switch (tone) {
        case 'ok':
            return '#22c55e'
        case 'warn':
            return '#eab308'
        case 'bad':
            return '#ef4444'
        default:
            return '#71717a'
    }
}

/** Full value for display in dev panel (wraps; no truncation). */
function displayDid(did: string | null): string {
    return did || '—'
}

function displayUserLine(user: { sub?: string; email?: string; name?: string; picture?: string }): string {
    const parts: string[] = []
    if (user.sub) parts.push(`sub: ${user.sub}`)
    if (user.email) parts.push(`email: ${user.email}`)
    if (user.name) parts.push(`name: ${user.name}`)
    return parts.length ? parts.join(' · ') : '—'
}

function ClipboardIcon() {
    return (
        <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
        >
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
    )
}

export type BasicDevToolbarProps = {
    /** When false, toolbar does not render. Defaults to true when used standalone. */
    enabled?: boolean
    /** Same as BasicProvider `debug` — when true, toolbar shows even off localhost. */
    debug?: boolean
}

type CopyableRowProps = {
    rowKey: string
    label: string
    copyText: string
    copiedKey: string | null
    onCopied: (key: string) => void
    children: React.ReactNode
}

function SectionHeader({ children }: { children: React.ReactNode }) {
    return (
        <div
            style={{
                fontSize: 10,
                fontWeight: 700,
                color: '#e4e4e7',
                letterSpacing: '0.07em',
                textTransform: 'uppercase',
                marginBottom: 8,
            }}
        >
            {children}
        </div>
    )
}

/** Full-bleed horizontal rule: only above a section (not under the header). */
function SectionRule() {
    const bleed = PANEL_PAD_X
    return (
        <div
            role="separator"
            style={{
                height: 1,
                background: 'rgba(255, 255, 255, 0.055)',
                marginLeft: -bleed,
                marginRight: -bleed,
                marginTop: 14,
                marginBottom: 10,
                width: `calc(100% + ${bleed * 2}px)`,
            }}
        />
    )
}

function CopyableRow({
    rowKey,
    label,
    copyText,
    copiedKey,
    onCopied,
    children,
}: CopyableRowProps) {
    const [hover, setHover] = useState(false)
    const canCopy = copyText.length > 0

    const handleClick = useCallback(
        (e: React.MouseEvent) => {
            e.stopPropagation()
            if (!canCopy) return
            void navigator.clipboard.writeText(copyText).then(() => onCopied(rowKey))
        },
        [canCopy, copyText, onCopied, rowKey],
    )

    return (
        <div
            role={canCopy ? 'button' : undefined}
            tabIndex={canCopy ? 0 : undefined}
            onClick={canCopy ? handleClick : undefined}
            onKeyDown={
                canCopy
                    ? (e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              handleClick(e as unknown as React.MouseEvent)
                          }
                      }
                    : undefined
            }
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            style={{
                display: 'flex',
                gap: 8,
                marginBottom: 6,
                alignItems: 'flex-start',
                borderRadius: 6,
                padding: '4px 6px',
                marginLeft: -6,
                marginRight: -6,
                cursor: canCopy ? 'pointer' : 'default',
                background: hover && canCopy ? 'rgba(255,255,255,0.06)' : 'transparent',
                transition: 'background 0.12s ease',
            }}
        >
            <span style={{ color: '#a1a1aa', minWidth: 88, flexShrink: 0, paddingTop: 2 }}>{label}</span>
            <span
                style={{
                    flex: 1,
                    minWidth: 0,
                    wordBreak: 'break-all',
                    paddingTop: 2,
                    lineHeight: 1.35,
                }}
            >
                {children}
            </span>
            {canCopy && (
                <span
                    style={{
                        flexShrink: 0,
                        color: copiedKey === rowKey ? '#22c55e' : '#71717a',
                        opacity: hover || copiedKey === rowKey ? 1 : 0,
                        transition: 'opacity 0.12s ease, color 0.12s ease',
                        paddingTop: 2,
                        display: 'flex',
                        alignItems: 'flex-start',
                    }}
                    title="Copy value"
                >
                    {copiedKey === rowKey ? (
                        <span style={{ fontSize: 10 }}>✓</span>
                    ) : (
                        <ClipboardIcon />
                    )}
                </span>
            )}
        </div>
    )
}

/**
 * Floating dev-only toolbar: auth, DB/sync, and schema status. Requires `BasicProvider` with `debug` or localhost / NODE_ENV=development for visibility unless `enabled` is forced.
 */
export function BasicDevToolbar({ enabled = true, debug }: BasicDevToolbarProps) {
    const {
        isReady,
        isSignedIn,
        user,
        did,
        scope,
        missingScopes,
        dbMode,
        dbStatus,
        devInfo,
        refreshSchemaStatus,
    } = useBasic()

    const [open, setOpen] = useState(false)
    const [refreshing, setRefreshing] = useState(false)
    const [copied, setCopied] = useState(false)
    const [rowCopied, setRowCopied] = useState<string | null>(null)

    const show =
        enabled && typeof window !== 'undefined' && isDevelopment(debug)

    const authTone = toneForAuth(isReady, isSignedIn)
    const dbTone = toneForDb(dbMode, dbStatus)
    const schemaTone = toneForSchema(devInfo)

    const syncTone: ChipTone =
        dbMode === 'remote'
            ? 'muted'
            : dbTone === 'ok' || dbStatus === DBStatus.SYNCING
              ? 'ok'
              : dbTone === 'warn'
                ? 'warn'
                : dbTone === 'bad'
                  ? 'bad'
                  : 'muted'

    const handleRefreshSchema = useCallback(async () => {
        setRefreshing(true)
        try {
            await refreshSchemaStatus()
        } finally {
            setRefreshing(false)
        }
    }, [refreshSchemaStatus])

    const missingList = missingScopes()

    const debugPayload = useMemo(() => {
        return {
            sdkVersion,
            isReady,
            isSignedIn,
            did: did ?? null,
            user: user
                ? {
                      sub: user.sub,
                      email: user.email,
                      name: user.name,
                      picture: user.picture,
                  }
                : null,
            scope,
            missingScopes: missingList,
            dbMode,
            dbStatus,
            indexedDbName: dbMode === 'sync' ? INDEXED_DB_NAME : null,
            schema: devInfo,
        }
    }, [isReady, isSignedIn, did, user, scope, dbMode, dbStatus, devInfo, missingList])

    const handleCopy = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(JSON.stringify(debugPayload, null, 2))
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        } catch {
            /* ignore */
        }
    }, [debugPayload])

    const onRowCopied = useCallback((key: string) => {
        setRowCopied(key)
        setTimeout(() => setRowCopied((k) => (k === key ? null : k)), 1500)
    }, [])

    if (!show) return null

    const shell: React.CSSProperties = {
        position: 'fixed',
        bottom: 12,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 99999,
        fontFamily:
            'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
        fontSize: 11,
        color: '#e4e4e7',
        pointerEvents: 'auto',
    }

    const bar: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 12px',
        borderRadius: 999,
        background: 'rgba(24, 24, 27, 0.92)',
        border: '1px solid rgba(63, 63, 70, 0.9)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
        cursor: 'pointer',
        userSelect: 'none',
    }

    /** Fixed box so flex line-height / strut cannot stretch dots when the pill width changes. */
    const dot = (tone: ChipTone) => (
        <span
            style={{
                display: 'block',
                boxSizing: 'border-box',
                width: 6,
                height: 6,
                minWidth: 6,
                minHeight: 6,
                maxWidth: 6,
                maxHeight: 6,
                borderRadius: '50%',
                background: chipColor(tone),
                flexShrink: 0,
            }}
        />
    )

    const dotSlot = (title: string, tone: ChipTone) => (
        <span
            title={title}
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 6,
                height: 6,
                flexShrink: 0,
                lineHeight: 0,
            }}
        >
            {dot(tone)}
        </span>
    )

    const panel: React.CSSProperties = {
        marginBottom: 8,
        maxHeight: '50vh',
        overflow: 'auto',
        padding: PANEL_PAD_X,
        borderRadius: 10,
        background: 'rgba(24, 24, 27, 0.96)',
        border: '1px solid rgba(63, 63, 70, 0.9)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
        minWidth: 300,
        maxWidth: 'min(560px, calc(100vw - 24px))',
    }

    const syncStatusText = dbStatusLabel(dbStatus)

    return (
        <div style={shell}>
            {open && (
                <div style={panel}>
                    <div style={{ marginBottom: 12 }}>
                        <div style={{ fontWeight: 600, fontSize: 12 }}>Basic SDK</div>
                        <div style={{ color: '#71717a', fontSize: 10, marginTop: 2 }}>v{sdkVersion}</div>
                    </div>

                    <SectionHeader>Auth</SectionHeader>
                    <CopyableRow
                        rowKey="ready"
                        label="Ready"
                        copyText={String(isReady)}
                        copiedKey={rowCopied}
                        onCopied={onRowCopied}
                    >
                        {String(isReady)}
                    </CopyableRow>
                    <CopyableRow
                        rowKey="signedIn"
                        label="Signed in"
                        copyText={String(isSignedIn)}
                        copiedKey={rowCopied}
                        onCopied={onRowCopied}
                    >
                        {String(isSignedIn)}
                    </CopyableRow>
                    <CopyableRow
                        rowKey="did"
                        label="DID"
                        copyText={did || ''}
                        copiedKey={rowCopied}
                        onCopied={onRowCopied}
                    >
                        {displayDid(did)}
                    </CopyableRow>
                    <CopyableRow
                        rowKey="user"
                        label="User"
                        copyText={user ? displayUserLine(user) : ''}
                        copiedKey={rowCopied}
                        onCopied={onRowCopied}
                    >
                        {user ? displayUserLine(user) : '—'}
                    </CopyableRow>
                    <CopyableRow
                        rowKey="scopes"
                        label="Scopes"
                        copyText={scope || ''}
                        copiedKey={rowCopied}
                        onCopied={onRowCopied}
                    >
                        {scope || '—'}
                    </CopyableRow>
                    <CopyableRow
                        rowKey="missingScopes"
                        label="Missing scopes"
                        copyText={missingList.length ? missingList.join(', ') : ''}
                        copiedKey={rowCopied}
                        onCopied={onRowCopied}
                    >
                        {missingList.length ? missingList.join(', ') : '—'}
                    </CopyableRow>

                    <SectionRule />
                    <SectionHeader>Database</SectionHeader>
                    <CopyableRow
                        rowKey="dbMode"
                        label="Mode"
                        copyText={dbMode}
                        copiedKey={rowCopied}
                        onCopied={onRowCopied}
                    >
                        {dbMode}
                    </CopyableRow>
                    <CopyableRow
                        rowKey="indexedDb"
                        label="IndexedDB"
                        copyText={dbMode === 'sync' ? INDEXED_DB_NAME : ''}
                        copiedKey={rowCopied}
                        onCopied={onRowCopied}
                    >
                        {dbMode === 'sync' ? INDEXED_DB_NAME : '—'}
                    </CopyableRow>
                    <CopyableRow
                        rowKey="syncStatus"
                        label="Sync / status"
                        copyText={syncStatusText}
                        copiedKey={rowCopied}
                        onCopied={onRowCopied}
                    >
                        {syncStatusText}
                    </CopyableRow>

                    <SectionRule />
                    <SectionHeader>Schema</SectionHeader>
                    {devInfo ? (
                        <>
                            <CopyableRow
                                rowKey="schemaProject"
                                label="Project"
                                copyText={devInfo.projectId ?? ''}
                                copiedKey={rowCopied}
                                onCopied={onRowCopied}
                            >
                                {devInfo.projectId ?? '—'}
                            </CopyableRow>
                            <CopyableRow
                                rowKey="schemaLocalVer"
                                label="Local version"
                                copyText={
                                    devInfo.localVersion !== undefined && devInfo.localVersion !== null
                                        ? String(devInfo.localVersion)
                                        : ''
                                }
                                copiedKey={rowCopied}
                                onCopied={onRowCopied}
                            >
                                {devInfo.localVersion ?? '—'}
                            </CopyableRow>
                            <CopyableRow
                                rowKey="schemaRemote"
                                label="Remote check"
                                copyText={devInfo.status}
                                copiedKey={rowCopied}
                                onCopied={onRowCopied}
                            >
                                {devInfo.status}
                            </CopyableRow>
                            <CopyableRow
                                rowKey="schemaValid"
                                label="Valid"
                                copyText={String(devInfo.valid)}
                                copiedKey={rowCopied}
                                onCopied={onRowCopied}
                            >
                                {String(devInfo.valid)}
                            </CopyableRow>
                            <CopyableRow
                                rowKey="schemaChecked"
                                label="Checked"
                                copyText={
                                    devInfo.lastCheckedAt
                                        ? new Date(devInfo.lastCheckedAt).toISOString()
                                        : ''
                                }
                                copiedKey={rowCopied}
                                onCopied={onRowCopied}
                            >
                                {devInfo.lastCheckedAt
                                    ? new Date(devInfo.lastCheckedAt).toLocaleString()
                                    : '—'}
                            </CopyableRow>
                            {devInfo.error ? (
                                <CopyableRow
                                    rowKey="schemaError"
                                    label="Error"
                                    copyText={devInfo.error}
                                    copiedKey={rowCopied}
                                    onCopied={onRowCopied}
                                >
                                    {devInfo.error}
                                </CopyableRow>
                            ) : null}
                        </>
                    ) : (
                        <CopyableRow
                            rowKey="schemaStatus"
                            label="Status"
                            copyText="No schema on provider"
                            copiedKey={rowCopied}
                            onCopied={onRowCopied}
                        >
                            No schema on provider
                        </CopyableRow>
                    )}

                    <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation()
                                void handleRefreshSchema()
                            }}
                            disabled={refreshing}
                            style={{
                                padding: '6px 10px',
                                borderRadius: 6,
                                border: '1px solid #3f3f46',
                                background: '#27272a',
                                color: '#e4e4e7',
                                cursor: refreshing ? 'wait' : 'pointer',
                                fontSize: 11,
                                fontFamily: 'inherit',
                            }}
                        >
                            {refreshing ? 'Refreshing…' : 'Refresh schema'}
                        </button>
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation()
                                void handleCopy()
                            }}
                            style={{
                                padding: '6px 10px',
                                borderRadius: 6,
                                border: '1px solid #3f3f46',
                                background: '#27272a',
                                color: '#e4e4e7',
                                cursor: 'pointer',
                                fontSize: 11,
                                fontFamily: 'inherit',
                            }}
                        >
                            {copied ? 'Copied' : 'Copy debug info'}
                        </button>
                    </div>
                </div>
            )}

            <button
                type="button"
                aria-expanded={open}
                onClick={() => setOpen((o) => !o)}
                style={{
                    ...bar,
                    border: 'none',
                    width: '100%',
                    cursor: 'pointer',
                }}
            >
                <span style={{ fontWeight: 600, letterSpacing: 0.02 }}>Basic</span>
                <span
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        marginLeft: 8,
                        height: 6,
                        flexShrink: 0,
                        lineHeight: 0,
                    }}
                >
                    {dotSlot('Auth', authTone)}
                    {dotSlot('DB', dbTone)}
                    {dotSlot('Sync', syncTone)}
                    {dotSlot('Schema', schemaTone)}
                </span>
                <span style={{ color: '#71717a', marginLeft: 4 }}>{open ? '▾' : '▴'}</span>
            </button>
        </div>
    )
}

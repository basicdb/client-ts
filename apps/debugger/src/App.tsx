/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { useState, useEffect, useRef } from 'react'
import './App.css'
import Editor from '@monaco-editor/react'

import { validateSchema, compareSchemas, validateUpdateSchema } from "@basictech/schema"
import { resolveDid, resolveHandle } from "@basictech/react"

function App() {
  const [projectId, setProjectId] = useState('bd1e08c6-25d0-44eb-bf5a-53922874b5e8')
  const [schema, setSchema] = useState(null)
  const [editedSchema, setEditedSchema] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [validationResult, setValidationResult] = useState(null)
  const [comparisonResult, setComparisonResult] = useState(null)
  const [updateValidationResult, setUpdateValidationResult] = useState(null)
  const editorRef = useRef(null)
  const decorationIdsRef = useRef([])

  // DID resolver state
  const [resolveInput, setResolveInput] = useState('')
  const [resolveResult, setResolveResult] = useState(null)
  const [resolveError, setResolveError] = useState(null)
  const [resolving, setResolving] = useState(false)

  useEffect(() => {
    if (editedSchema && schema) {
      const result = compareSchemas(schema, editedSchema)
      console.log(result)
      setComparisonResult(result)
    }
  }, [editedSchema, schema])

  useEffect(() => {
    if (editedSchema && schema) {
      const result = validateUpdateSchema(schema, editedSchema)
      setUpdateValidationResult(result)
    }
  }, [editedSchema, schema])

  useEffect(() => {
    if (editedSchema) {
      const result = validateSchema(editedSchema)
      setValidationResult(result)
      
      // Clear decorations if schema is valid
      if (result.valid && editorRef.current) {
        editorRef.current.deltaDecorations(decorationIdsRef.current, [])
        decorationIdsRef.current = []
      }
    }
  }, [editedSchema])

  const handleEditorDidMount = (editor) => {
    editorRef.current = editor
  }

  const highlightError = (error) => {
    if (!editorRef.current) return

    // Clear existing decorations
    editorRef.current.deltaDecorations(decorationIdsRef.current, [])
    decorationIdsRef.current = []

    // Get the editor content and split into lines
    const jsonString = JSON.stringify(editedSchema, null, 2)
    const lines = jsonString.split('\n')
    
    // Convert instancePath to a searchable string
    const pathParts = error.instancePath.split('/').filter(Boolean)
    
    // Find the line containing our search string by following the path
    let targetLine = 1
    let currentPathIndex = 0
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const trimmedLine = line.trim()
      
      // Look for the current path part
      if (trimmedLine.includes(`"${pathParts[currentPathIndex]}"`)) {
        currentPathIndex++
        if (currentPathIndex === pathParts.length) {
          targetLine = i + 1
          break
        }
      }
    }

    console.log("targetLine", targetLine)
    // Add decoration
    const newDecorationIds = editorRef.current.deltaDecorations([], [{
      range: {
        startLineNumber: targetLine,
        startColumn: 1,
        endLineNumber: targetLine,
        endColumn: 1
      },
      options: {
        isWholeLine: true,
        className: 'error-line',
        glyphMarginClassName: 'error-glyph'
      }
    }])
    
    decorationIdsRef.current = newDecorationIds
  }

  const fetchSchema = async () => {
    if (!projectId) return
    
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`https://api.basic.tech/project/${projectId}/schema`)
      const data = await response.json()
      if (data.data && data.data[0]?.schema) {
        setSchema(data.data[0].schema)
        setEditedSchema(data.data[0].schema)
      } else {
        setError('Invalid schema response format')
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch schema')
    } finally {
      setLoading(false)
    }
  }

  const handleEditorChange = (value) => {
    try {
      const parsedSchema = JSON.parse(value)
      setEditedSchema(parsedSchema)
    } catch {
      // Invalid JSON, but we'll keep the raw value for editing
    }
  }

  const consoleDebug = () => {
    console.log(schema)
    const valid = validateSchema(schema)
    console.log(valid)
  }

  const handleResolve = async () => {
    if (!resolveInput.trim()) return
    setResolving(true)
    setResolveError(null)
    setResolveResult(null)
    try {
      const input = resolveInput.trim()
      const result = input.startsWith('did:')
        ? await resolveDid(input)
        : await resolveHandle(input)
      setResolveResult(result)
      console.log('Resolve result:', result)
    } catch (err) {
      setResolveError(err.message || 'Resolution failed')
      console.error('Resolve error:', err)
    } finally {
      setResolving(false)
    }
  }

  return (
    <>
      <style>
        {`
          .error-line {
            background-color: rgba(255, 68, 68, 0.1);
          }
          .error-glyph {
            background-color: #f44336;
            width: 5px !important;
            margin-left: 5px;
          }
        `}
      </style>
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        padding: '1rem',
        background: '#1a1a1a',
        borderBottom: '1px solid #333',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        zIndex: 100,
        height: '60px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <input
            type="text"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            placeholder="Enter Project ID"
            style={{
              padding: '0.5rem',
              borderRadius: '4px',
              border: '1px solid #333',
              background: '#2a2a2a',
              color: 'white',
              minWidth: '300px'
            }}
          />
          <button 
            onClick={fetchSchema}
            disabled={loading || !projectId}
            style={{
              opacity: loading || !projectId ? 0.5 : 1
            }}
          >
            {loading ? 'Loading...' : 'Fetch Schema'}
          </button>
          <button 
            onClick={consoleDebug}
            disabled={loading || !projectId}
            style={{
              opacity: loading || !projectId ? 0.5 : 1
            }}
          >
            Console Debug
          </button>
        </div>
      </div>

      <div style={{ 
        position: 'fixed',
        top: '60px',
        left: 0,
        right: 0,
        bottom: 0,
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '0',
        background: '#1a1a1a'
      }}>
        <div style={{
          background: '#1a1a1a',
          padding: '1rem',
          paddingTop: '2rem',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          borderRight: '1px solid #333'
        }}>
          <h2 style={{ margin: '0 0 1rem 0' }}>Schema</h2>
          {error && (
            <div style={{ color: '#ff4444', marginBottom: '1rem' }}>
              Error: {error}
            </div>
          )}
          {schema ? (
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <Editor
                height="100%"
                defaultLanguage="json"
                value={JSON.stringify(editedSchema, null, 2)}
                onChange={handleEditorChange}
                onMount={handleEditorDidMount}
                theme="vs-dark"
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  lineNumbers: 'on',
                  wordWrap: 'on',
                  formatOnPaste: true,
                  formatOnType: true,
                  automaticLayout: true,
                  glyphMargin: true
                }}
              />
            </div>
          ) : (
            <div style={{ 
              color: '#666',
              textAlign: 'center',
              padding: '2rem'
            }}>
              Enter a Project ID and click "Fetch Schema" to view the schema
            </div>
          )}
        </div>

        <div style={{
          background: '#1a1a1a',
          padding: '1rem',
          paddingTop: '2rem',
          overflow: 'auto'
        }}>
          <h2 style={{ margin: '0 0 1rem 0' }}>Debug Tools</h2>

          {/* DID / Handle Resolver */}
          <div style={{
            background: '#2a2a2a',
            borderRadius: '4px',
            border: '1px solid #333',
            overflow: 'hidden',
            marginBottom: '1rem'
          }}>
            <div style={{
              padding: '0.75rem 1rem',
              borderBottom: '1px solid #333',
              fontSize: '0.9rem',
              fontWeight: 500,
              color: '#fff'
            }}>
              DID / Handle Resolver
            </div>
            <div style={{ padding: '0.75rem 1rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <input
                  type="text"
                  value={resolveInput}
                  onChange={(e) => setResolveInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleResolve()}
                  placeholder="alice.basic.id or did:web:..."
                  style={{
                    flex: 1,
                    padding: '0.5rem',
                    borderRadius: '4px',
                    border: '1px solid #333',
                    background: '#1a1a1a',
                    color: 'white',
                    fontSize: '0.85rem'
                  }}
                />
                <button
                  onClick={handleResolve}
                  disabled={resolving || !resolveInput.trim()}
                  style={{
                    opacity: resolving || !resolveInput.trim() ? 0.5 : 1,
                    whiteSpace: 'nowrap'
                  }}
                >
                  {resolving ? 'Resolving...' : 'Resolve'}
                </button>
              </div>
              {resolveError && (
                <div style={{
                  color: '#ff4444',
                  fontSize: '0.85rem',
                  padding: '0.5rem',
                  background: 'rgba(255, 68, 68, 0.1)',
                  borderRadius: '4px',
                  marginBottom: '0.5rem'
                }}>
                  {resolveError}
                </div>
              )}
              {resolveResult && (
                <div style={{ fontSize: '0.85rem', color: '#ccc' }}>
                  <div style={{ marginBottom: '0.5rem' }}>
                    <span style={{ color: '#888' }}>DID: </span>
                    <span style={{ color: '#4caf50', wordBreak: 'break-all' }}>{resolveResult.did}</span>
                  </div>
                  {resolveResult.handle && (
                    <div style={{ marginBottom: '0.5rem' }}>
                      <span style={{ color: '#888' }}>Handle: </span>
                      <span style={{ color: '#fff' }}>{resolveResult.handle}</span>
                    </div>
                  )}
                  <div style={{ marginBottom: '0.5rem' }}>
                    <span style={{ color: '#888' }}>PDS: </span>
                    <span style={{ color: '#42a5f5', wordBreak: 'break-all' }}>{resolveResult.pdsUrl}</span>
                  </div>
                  <div style={{ marginBottom: '0.5rem' }}>
                    <span style={{ color: '#888' }}>Auth: </span>
                    <span style={{ color: '#42a5f5', wordBreak: 'break-all' }}>{resolveResult.authorization_endpoint}</span>
                  </div>
                  <div style={{ marginBottom: '0.5rem' }}>
                    <span style={{ color: '#888' }}>Token: </span>
                    <span style={{ color: '#42a5f5', wordBreak: 'break-all' }}>{resolveResult.token_endpoint}</span>
                  </div>
                  <details style={{ marginTop: '0.5rem' }}>
                    <summary style={{ cursor: 'pointer', color: '#888', fontSize: '0.85rem' }}>DID Document</summary>
                    <pre style={{
                      background: '#1a1a1a',
                      padding: '0.5rem',
                      borderRadius: '4px',
                      marginTop: '0.5rem',
                      overflow: 'auto',
                      maxHeight: '300px',
                      fontSize: '0.8rem',
                      color: '#aaa'
                    }}>
                      {JSON.stringify(resolveResult.didDocument, null, 2)}
                    </pre>
                  </details>
                </div>
              )}
            </div>
          </div>

          {validationResult && (
            <div style={{
              background: '#2a2a2a',
              borderRadius: '4px',
              border: '1px solid #333',
              overflow: 'hidden',
              marginBottom: '1rem'
            }}>
              <div style={{
                padding: '0.75rem 1rem',
                borderBottom: '1px solid #333',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                cursor: 'pointer'
              }}
              onClick={() => console.log('Schema Validation Result:', validationResult)}
              >
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: validationResult.valid ? '#4caf50' : '#f44336'
                }} />
                <span style={{ 
                  fontSize: '0.9rem',
                  fontWeight: 500,
                  color: '#fff'
                }}>
                  Schema {validationResult.valid ? 'Valid' : 'Not Valid'}
                </span>
              </div>
              {validationResult.errors && validationResult.errors.length > 0 && (
                <div style={{ padding: '0.5rem 0' }}>
                  {validationResult.errors.map((error, index) => (
                    <div 
                      key={index}
                      onClick={() => {
                        console.log(error)
                        highlightError(error)
                      }}
                      style={{
                        padding: '0.5rem 1rem',
                        borderBottom: index < validationResult.errors.length - 1 ? '1px solid #333' : 'none',
                        fontSize: '0.9rem',
                        color: '#ff4444',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'background-color 0.2s',
                        ':hover': {
                          background: '#333'
                        }
                      }}
                      onMouseOver={(e) => e.currentTarget.style.background = '#333'}
                      onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      {error.message}
                      {error.instancePath && (
                        <div style={{ 
                          color: '#666',
                          fontSize: '0.85rem',
                          marginTop: '0.25rem',
                          textAlign: 'left'
                        }}>
                          {error.instancePath}
                        </div>
                      )}
                      {error.keyword === 'enum' && error.params?.allowedValues && (
                        <div style={{ 
                          color: '#888',
                          fontSize: '0.85rem',
                          marginTop: '0.25rem',
                          textAlign: 'left'
                        }}>
                          Allowed values: {error.params.allowedValues.join(', ')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {comparisonResult && (
            <div style={{
              background: '#2a2a2a',
              borderRadius: '4px',
              border: '1px solid #333',
              overflow: 'hidden',
              marginBottom: '1rem'
            }}>
              <div style={{
                padding: '0.75rem 1rem',
                borderBottom: '1px solid #333',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                cursor: 'pointer'
              }}
              onClick={() => console.log('Schema Comparison Result:', comparisonResult)}
              >
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: comparisonResult.valid ? '#4caf50' : '#ffa726'
                }} />
                <span style={{ 
                  fontSize: '0.9rem',
                  fontWeight: 500,
                  color: '#fff'
                }}>
                  Schema {comparisonResult.valid ? 'Unchanged' : 'Has Changes'}
                </span>
              </div>
              {!comparisonResult.valid && comparisonResult.changes.length > 0 && (
                <div style={{ padding: '0.5rem 0' }}>
                  {comparisonResult.changes.map((change, index) => (
                    <div 
                      key={index}
                      style={{
                        padding: '0.5rem 1rem',
                        borderBottom: index < comparisonResult.changes.length - 1 ? '1px solid #333' : 'none',
                        fontSize: '0.9rem',
                        color: '#ffa726',
                        textAlign: 'left'
                      }}
                    >
                      <div style={{ fontWeight: 500 }}>
                        {change.type === 'property_changed' && 'Property Changed'}
                        {change.type === 'property_removed' && 'Property Removed'}
                        {change.type === 'table_added' && 'Table Added'}
                        {change.type === 'table_removed' && 'Table Removed'}
                        {change.type === 'field_added' && 'Field Added'}
                        {change.type === 'field_removed' && 'Field Removed'}
                        {change.type === 'field_type_changed' && 'Field Type Changed'}
                        {change.type === 'field_required_changed' && 'Field Required Changed'}
                        {change.type === 'field_property_added' && 'Field Property Added'}
                        {change.type === 'field_property_changed' && 'Field Property Changed'}
                        {change.type === 'field_property_removed' && 'Field Property Removed'}
                      </div>
                      {change.property && (
                        <div style={{ 
                          color: '#888',
                          fontSize: '0.85rem',
                          marginTop: '0.25rem'
                        }}>
                          Property: {change.property}
                        </div>
                      )}
                      {change.table && (
                        <div style={{ 
                          color: '#888',
                          fontSize: '0.85rem',
                          marginTop: '0.25rem'
                        }}>
                          Table: {change.table}
                        </div>
                      )}
                      {change.field && (
                        <div style={{ 
                          color: '#888',
                          fontSize: '0.85rem',
                          marginTop: '0.25rem'
                        }}>
                          Field: {change.field}
                        </div>
                      )}
                      {change.path && (
                        <div style={{ 
                          color: '#888',
                          fontSize: '0.85rem',
                          marginTop: '0.25rem'
                        }}>
                          Path: {change.path}
                        </div>
                      )}
                      {(change.old !== undefined || change.new !== undefined) && (
                        <div style={{ 
                          color: '#888',
                          fontSize: '0.85rem',
                          marginTop: '0.25rem'
                        }}>
                          {change.old !== undefined && <div>From: {JSON.stringify(change.old)}</div>}
                          {change.new !== undefined && <div>To: {JSON.stringify(change.new)}</div>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {updateValidationResult && (
            <div style={{
              background: '#2a2a2a',
              borderRadius: '4px',
              border: '1px solid #333',
              overflow: 'hidden'
            }}>
              <div style={{
                padding: '0.75rem 1rem',
                borderBottom: '1px solid #333',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                cursor: 'pointer'
              }}
              onClick={() => console.log('Schema Update Validation Result:', updateValidationResult)}
              >
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: updateValidationResult.valid ? '#4caf50' : '#f44336'
                }} />
                <span style={{ 
                  fontSize: '0.9rem',
                  fontWeight: 500,
                  color: '#fff'
                }}>
                  Schema {updateValidationResult.valid ? 'Can Be Published' : 'Cannot Be Published'}
                </span>
              </div>
              {!updateValidationResult.valid && updateValidationResult.errors && updateValidationResult.errors.length > 0 && (
                <div style={{ padding: '0.5rem 0' }}>
                  {updateValidationResult.errors.map((error, index) => (
                    <div 
                      key={index}
                      style={{
                        padding: '0.5rem 1rem',
                        borderBottom: index < updateValidationResult.errors.length - 1 ? '1px solid #333' : 'none',
                        fontSize: '0.9rem',
                        color: '#f44336',
                        textAlign: 'left'
                      }}
                    >
                      {error.message}
                      {error.instancePath && (
                        <div style={{ 
                          color: '#888',
                          fontSize: '0.85rem',
                          marginTop: '0.25rem'
                        }}>
                          {error.instancePath}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export default App

import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { socket } from '../lib/socket'

const SAVE_INTERVAL = 3000

export default function Editor({ session }) {
  const { docId } = useParams()
  const navigate = useNavigate()
  const editorRef = useRef(null)
  const quillRef = useRef(null)
  const [showShare, setShowShare] = useState(false)
  const [shareEmail, setShareEmail] = useState('')
  const [shareStatus, setShareStatus] = useState('')
  const [isOwner, setIsOwner] = useState(false)
  const [doc, setDoc] = useState(null)
  const [status, setStatus] = useState('loading')
  const [activeUsers, setActiveUsers] = useState([])
  const saveTimerRef = useRef(null)
  const isRemoteChange = useRef(false)
  const COLORS = ['#E8572A', '#2A7BE8', '#2AE857', '#E8A52A', '#892AE8']
  const initialized = useRef(false)

    // Load Quill dynamically
  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://cdn.quilljs.com/1.3.7/quill.snow.css'
    document.head.appendChild(link)

    const script = document.createElement('script')
    script.src = 'https://cdn.quilljs.com/1.3.7/quill.js'
    script.onload = () => initEditor()
    document.head.appendChild(script)
  }, [])

  async function initEditor() {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('id', docId)
      .single()

    if (error || !data) { setStatus('error'); return }
    setDoc(data)

    const quill = new window.Quill(editorRef.current, {
      theme: 'snow',
      placeholder: 'Start writing...',
      modules: {
        toolbar: [
          [{ header: [1, 2, 3, false] }],
          ['bold', 'italic', 'underline', 'strike'],
          [{ list: 'ordered' }, { list: 'bullet' }],
          ['blockquote', 'code-block'],
          ['clean']
        ]
      }
    })

    // Load existing content
    if (data.content) {
      try { quill.setContents(JSON.parse(data.content)) }
      catch { quill.setText(data.content) }
    }

    quillRef.current = quill
    setStatus('ready')
    checkOwner()

    // Socket.io setup
    const userName = session?.user?.user_metadata?.full_name || session?.user?.email
    socket.connect()
    socket.emit('join-doc', { docId, userName })

    socket.on('doc-update', (delta) => {
      isRemoteChange.current = true
      quill.updateContents(delta)
      isRemoteChange.current = false
    })

    socket.on('users-update', (users) => {
      setActiveUsers(users.filter(u => u.socketId !== socket.id))
    })

    // Send changes + auto save
    quill.on('text-change', (delta, _old, source) => {
      if (source !== 'user' || isRemoteChange.current) return
      socket.emit('doc-change', { docId, delta })
      setStatus('saving')
      clearTimeout(saveTimerRef.current)
      saveTimerRef.current = setTimeout(() => saveContent(quill), SAVE_INTERVAL)
    })
  }

  async function saveContent(quill) {
    const content = JSON.stringify(quill.getContents())
    const { error } = await supabase
      .from('documents')
      .update({ content })
      .eq('id', docId)

    if (!error) {
      await supabase.from('versions').insert({ doc_id: docId, content })
      setStatus('saved')
      setTimeout(() => setStatus('ready'), 2000)
    } else {
      console.error('Save error:', error)
      setStatus('ready')
    }
  }

  function handleManualSave() {
    if (!quillRef.current) return
    clearTimeout(saveTimerRef.current)
    setStatus('saving')
    saveContent(quillRef.current)
  }


  async function handleShare() {
    if (!shareEmail.trim()) return
    setShareStatus('loading')

    // Find user by email
    const { data: users, error } = await supabase
        .rpc('get_user_by_email', { email_input: shareEmail.trim() })

    if (error || !users?.length) {
        setShareStatus('User not found')
        return
    }

    const targetUser = users[0]

    // Add to document_members
    const { error: memberError } = await supabase
        .from('document_members')
        .insert({ doc_id: docId, user_id: targetUser.id, role: 'editor' })

    if (memberError) {
        setShareStatus(memberError.code === '23505' ? 'User already has access' : 'Error adding user')
    } else {
        setShareStatus(`✓ ${shareEmail} can now edit this doc`)
        setShareEmail('')
    }
  }

async function checkOwner() {
  const { data } = await supabase
    .from('document_members')
    .select('role')
    .eq('doc_id', docId)
    .eq('user_id', session.user.id)
    .single()
  setIsOwner(data?.role === 'owner')
}

  useEffect(() => {
    return () => {
      socket.emit('leave-doc', docId)
      socket.off('doc-update')
      socket.off('users-update')
      socket.disconnect()
      clearTimeout(saveTimerRef.current)
    }
  }, [docId])

  const statusLabel = {
    loading: 'Loading...', ready: 'All changes saved',
    saving: 'Saving...', saved: 'Saved ✓', error: 'Error'
  }

  if (status === 'error') return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <p style={{ marginBottom: '16px', color: '#0D0D0D' }}>Document not found</p>
        <button onClick={() => navigate('/dashboard')} style={{ backgroundColor: '#0D0D0D', color: '#fff', border: 'none', padding: '12px 24px', cursor: 'pointer' }}>Back</button>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F5F2EB', display: 'flex', flexDirection: 'column', fontFamily: 'sans-serif' }}>
      {/* Top bar */}
      <div style={{ borderBottom: '1px solid #E2DDD6', backgroundColor: '#fff', padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button onClick={() => navigate('/dashboard')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9A9A8E', fontSize: '13px' }}>
            ← Docs
          </button>
          <span style={{ color: '#E2DDD6' }}>|</span>
          <span style={{ fontWeight: '600', color: '#0D0D0D', fontSize: '14px' }}>{doc?.title || '...'}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {activeUsers.length > 0 && (
            <div style={{ display: 'flex', gap: '4px' }}>
              {activeUsers.slice(0, 4).map((user, i) => (
                <div key={user.id} title={user.name} style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: COLORS[i % COLORS.length], display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '11px', fontWeight: 'bold' }}>
                  {user.name?.[0]?.toUpperCase() || '?'}
                </div>
              ))}
            </div>
          )}
          <span style={{ color: '#9A9A8E', fontSize: '12px', fontFamily: 'monospace' }}>{statusLabel[status]}</span>
          <button
            onClick={handleManualSave}
            disabled={status === 'saving' || status === 'loading'}
            style={{ backgroundColor: '#0D0D0D', color: '#fff', border: 'none', padding: '8px 16px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}
          >
            Save
          </button>
          {isOwner && (
            <button
                onClick={() => setShowShare(true)}
                style={{ backgroundColor: '#fff', color: '#0D0D0D', border: '1px solid #E2DDD6', padding: '8px 16px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}
            >
                Share
            </button>
          )}
        </div>
        {showShare && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
            <div style={{ backgroundColor: '#fff', padding: '32px', width: '100%', maxWidth: '400px' }}>
            <h2 style={{ fontWeight: 'bold', fontSize: '20px', color: '#0D0D0D', marginBottom: '8px' }}>Share Document</h2>
            <p style={{ color: '#9A9A8E', fontSize: '13px', marginBottom: '24px' }}>Invite someone to edit this document</p>

            <label style={{ display: 'block', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '2px', color: '#9A9A8E', marginBottom: '8px' }}>Email address</label>
            <input
                style={{ width: '100%', border: '1px solid #E2DDD6', padding: '12px 16px', fontSize: '14px', outline: 'none', marginBottom: '16px', boxSizing: 'border-box' }}
                type="email"
                placeholder="teammate@example.com"
                value={shareEmail}
                onChange={e => { setShareEmail(e.target.value); setShareStatus('') }}
                onKeyDown={e => e.key === 'Enter' && handleShare()}
                autoFocus
            />

            {shareStatus && (
                <p style={{ fontSize: '13px', marginBottom: '16px', color: shareStatus.startsWith('✓') ? '#2AE857' : '#E8572A' }}>
                {shareStatus === 'loading' ? 'Adding user...' : shareStatus}
                </p>
            )}

            <div style={{ display: 'flex', gap: '12px' }}>
                <button
                onClick={handleShare}
                disabled={shareStatus === 'loading'}
                style={{ flex: 1, backgroundColor: '#0D0D0D', color: '#fff', border: 'none', padding: '12px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}
                >
                Add Editor
                </button>
                <button
                onClick={() => { setShowShare(false); setShareEmail(''); setShareStatus('') }}
                style={{ flex: 1, backgroundColor: '#fff', color: '#0D0D0D', border: '1px solid #E2DDD6', padding: '12px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}
                >
                Close
                </button>
            </div>
            </div>
        </div>
        )}
      </div>

      {/* Editor container */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', maxWidth: '860px', width: '100%', margin: '32px auto', backgroundColor: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
        {status === 'loading' && (
          <p style={{ color: '#9A9A8E', padding: '32px', textAlign: 'center' }}>Loading...</p>
        )}
        <div ref={editorRef} style={{ flex: 1 }} />
      </div>
    </div>
  )
}
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

export default function Dashboard({ session }) {
  const [docs, setDocs] = useState([])
  const [loading, setLoading] = useState(true)
  const [newTitle, setNewTitle] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [creating, setCreating] = useState(false)
  const navigate = useNavigate()

  const userName = session?.user?.user_metadata?.full_name || session?.user?.email

  useEffect(() => {
    fetchDocs()
  }, [])

  async function fetchDocs() {
    setLoading(true)

    // Get only docs where current user is a member
    const { data, error } = await supabase
        .from('document_members')
        .select('doc_id, role, documents(*)')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })

    console.log('fetchDocs result:', data, error)
    if (!error) setDocs(data?.map(d => ({ ...d.documents, role: d.role })) || [])
    setLoading(false)
  }

  async function createDoc() {
    if (!newTitle.trim()) return
    setCreating(true)

    // Create the document
    const { data, error } = await supabase
        .from('documents')
        .insert({ title: newTitle.trim(), content: '', owner_id: session.user.id })
        .select()
        .single()

    if (!error && data) {
        // Add creator as owner in document_members
        await supabase.from('document_members').insert({
        doc_id: data.id,
        user_id: session.user.id,
        role: 'owner'
        })
        navigate(`/editor/${data.id}`)
    }
    setCreating(false)
  }

  async function deleteDoc(docId, e) {
    e.stopPropagation()
    if (!confirm('Delete this document?')) return
    await supabase.from('documents').delete().eq('id', docId)
    setDocs(prev => prev.filter(d => d.id !== docId))
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
  }

  function formatDate(ts) {
    return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F5F2EB', fontFamily: 'sans-serif' }}>
      <nav style={{ borderBottom: '1px solid #E2DDD6', backgroundColor: '#fff', padding: '16px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: 'bold', fontSize: '18px', color: '#0D0D0D' }}>COLLAB</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <span style={{ color: '#9A9A8E', fontSize: '14px' }}>{userName}</span>
          <button onClick={handleSignOut} style={{ background: 'none', border: 'none', color: '#9A9A8E', cursor: 'pointer', fontSize: '13px' }}>Sign Out</button>
        </div>
      </nav>

      <div style={{ maxWidth: '960px', margin: '0 auto', padding: '48px 32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '48px' }}>
          <h1 style={{ fontSize: '36px', fontWeight: 'bold', color: '#0D0D0D', margin: 0 }}>Your Documents</h1>
          <button onClick={() => setShowModal(true)} style={{ backgroundColor: '#0D0D0D', color: '#fff', border: 'none', padding: '12px 24px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
            + New Document
          </button>
        </div>

        {loading ? (
          <p style={{ color: '#9A9A8E' }}>Loading...</p>
        ) : docs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px', border: '2px dashed #E2DDD6' }}>
            <p style={{ color: '#0D0D0D', fontWeight: '600', marginBottom: '8px' }}>No documents yet</p>
            <p style={{ color: '#9A9A8E', fontSize: '14px', marginBottom: '24px' }}>Create your first document to get started</p>
            <button onClick={() => setShowModal(true)} style={{ backgroundColor: '#0D0D0D', color: '#fff', border: 'none', padding: '12px 24px', cursor: 'pointer' }}>Create Document</button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
            {docs.map(doc => (
              <div
                key={doc.id}
                onClick={() => navigate(`/editor/${doc.id}`)}
                style={{ backgroundColor: '#fff', border: '1px solid #E2DDD6', padding: '24px', cursor: 'pointer', position: 'relative' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = '#0D0D0D'}
                onMouseLeave={e => e.currentTarget.style.borderColor = '#E2DDD6'}
              >
                <p style={{ fontWeight: '600', color: '#0D0D0D', marginBottom: '8px' }}>{doc.title}</p>
                <p style={{ color: '#9A9A8E', fontSize: '12px' }}>{formatDate(doc.created_at)}</p>
                <button onClick={(e) => deleteDoc(doc.id, e)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', color: '#9A9A8E', cursor: 'pointer', fontSize: '18px' }}>×</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ backgroundColor: '#fff', padding: '32px', width: '100%', maxWidth: '400px' }}>
            <h2 style={{ fontWeight: 'bold', fontSize: '22px', color: '#0D0D0D', marginBottom: '24px' }}>New Document</h2>
            <input
              style={{ width: '100%', border: '1px solid #E2DDD6', padding: '12px 16px', fontSize: '14px', outline: 'none', marginBottom: '24px', boxSizing: 'border-box' }}
              type="text"
              placeholder="Untitled Document"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && createDoc()}
              autoFocus
            />
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={createDoc} disabled={creating} style={{ flex: 1, backgroundColor: '#0D0D0D', color: '#fff', border: 'none', padding: '12px', cursor: 'pointer', fontWeight: '600' }}>
                {creating ? 'Creating...' : 'Create'}
              </button>
              <button onClick={() => { setShowModal(false); setNewTitle('') }} style={{ flex: 1, backgroundColor: '#fff', color: '#0D0D0D', border: '1px solid #E2DDD6', padding: '12px', cursor: 'pointer', fontWeight: '600' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
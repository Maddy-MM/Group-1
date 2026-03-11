import { Router } from 'express'
import { supabase } from '../index.js'

const router = Router()

router.get('/:id', async (req, res) => {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('id', req.params.id)
    .single()
  if (error) return res.status(404).json({ error: 'Document not found' })
  res.json(data)
})

router.patch('/:id', async (req, res) => {
  const { content } = req.body
  const { data, error } = await supabase
    .from('documents')
    .update({ content })
    .eq('id', req.params.id)
    .select()
    .single()
  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

router.get('/:id/versions', async (req, res) => {
  const { data, error } = await supabase
    .from('versions')
    .select('*')
    .eq('doc_id', req.params.id)
    .order('saved_at', { ascending: false })
    .limit(20)
  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

export default router

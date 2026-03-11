import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import docsRouter from './routes/docs.js'

dotenv.config()

const app = express()
const httpServer = createServer(app)

const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST']
  }
})

export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }))
app.use(express.json())
app.use('/docs', docsRouter)

app.get('/health', (_req, res) => res.json({ status: 'ok' }))

const docRooms = new Map()

io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`)

  socket.on('join-doc', ({ docId, userName }) => {
    socket.join(docId)
    if (!docRooms.has(docId)) docRooms.set(docId, new Map())
    docRooms.get(docId).set(socket.id, { socketId: socket.id, id: socket.id, name: userName })
    const users = Array.from(docRooms.get(docId).values())
    io.to(docId).emit('users-update', users)
  })

  socket.on('doc-change', ({ docId, delta }) => {
    socket.to(docId).emit('doc-update', delta)
  })

  socket.on('leave-doc', (docId) => {
    socket.leave(docId)
    if (docRooms.has(docId)) {
      docRooms.get(docId).delete(socket.id)
      const users = Array.from(docRooms.get(docId).values())
      io.to(docId).emit('users-update', users)
    }
  })

  socket.on('disconnect', () => {
    for (const [docId, users] of docRooms.entries()) {
      if (users.has(socket.id)) {
        users.delete(socket.id)
        io.to(docId).emit('users-update', Array.from(users.values()))
      }
    }
    console.log(`Socket disconnected: ${socket.id}`)
  })
})

const PORT = process.env.PORT || 4000
httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
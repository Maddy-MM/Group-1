const express = require("express")
const http = require("http")
const cors = require("cors")
const { Server } = require("socket.io")

const handleDocSocket = require("./socket/docSocket")

const app = express()

app.use(cors())

const server = http.createServer(app)

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
})

io.on("connection", (socket) => {
  console.log("User connected:", socket.id)

  handleDocSocket(io, socket)
})

server.listen(4000, () => {
  console.log("Realtime server running on port 4000")
})
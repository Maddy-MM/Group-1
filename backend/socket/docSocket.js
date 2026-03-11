const {
  addUser,
  removeUser,
  removeUserFromDoc,
  getUsers
} = require("../utils/rooms")

function handleDocSocket(io, socket) {

  // join document room
  socket.on("join-doc", ({ docId, userName }) => {

    socket.join(docId)

    addUser(docId, {
      id: socket.id,
      name: userName
    })

    const users = getUsers(docId)

    io.to(docId).emit("users-update", users)

    console.log(`${userName} joined ${docId}`)
  })


  // document changes
  socket.on("doc-change", ({ docId, delta }) => {

    socket.to(docId).emit("doc-update", delta)

  })


  // leaving document
  socket.on("leave-doc", (docId) => {

    removeUserFromDoc(docId, socket.id)

    const users = getUsers(docId)

    io.to(docId).emit("users-update", users)

  })


  // disconnect
  socket.on("disconnect", () => {

    removeUser(socket.id)

    console.log("User disconnected:", socket.id)

  })
}

module.exports = handleDocSocket
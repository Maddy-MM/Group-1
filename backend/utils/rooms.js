const rooms = {}

function addUser(docId, user) {
  if (!rooms[docId]) {
    rooms[docId] = []
  }

  rooms[docId].push(user)
}

function removeUser(socketId) {
  for (const docId in rooms) {
    rooms[docId] = rooms[docId].filter(
      (user) => user.id !== socketId
    )
  }
}

function removeUserFromDoc(docId, socketId) {
  if (!rooms[docId]) return

  rooms[docId] = rooms[docId].filter(
    (user) => user.id !== socketId
  )
}

function getUsers(docId) {
  return rooms[docId] || []
}

module.exports = {
  addUser,
  removeUser,
  removeUserFromDoc,
  getUsers
}
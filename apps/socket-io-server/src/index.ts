import {Server} from 'socket.io'

const PORT = 3000

const io = new Server(PORT)

io.on('connection', (socket) => {
  socket.on('ping', (arg) => {
    socket.emit('pong', 'pong')
  })
})
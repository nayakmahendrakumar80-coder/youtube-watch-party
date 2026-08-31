const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname)));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

const rooms = {};

function generatePin() {
  let pin;
  do {
    pin = Math.floor(1000 + Math.random() * 9000).toString();
  } while (rooms[pin]);
  return pin;
}

io.on('connection', (socket) => {
  let currentRoom = null;

  socket.on('create_room', (data) => {
    const pin = generatePin();
    currentRoom = pin;
    socket.join(pin);

    rooms[pin] = {
      videoId: data.videoId || 'dQw4w9WgXcQ',
      currentTime: 0,
      isPlaying: true
    };

    socket.emit('room_created', { pin, roomState: rooms[pin] });
  });

  socket.on('join_room', (pin) => {
    if (rooms[pin]) {
      currentRoom = pin;
      socket.join(pin);
      socket.emit('room_joined', { pin, roomState: rooms[pin] });
    } else {
      socket.emit('join_error', 'Invalid PIN! Room does not exist.');
    }
  });

  socket.on('player_play', (data) => {
    if (!currentRoom || !rooms[currentRoom]) return;
    rooms[currentRoom].isPlaying = true;
    rooms[currentRoom].currentTime = data.currentTime;
    socket.to(currentRoom).emit('player_play', data);
  });

  socket.on('player_pause', (data) => {
    if (!currentRoom || !rooms[currentRoom]) return;
    rooms[currentRoom].isPlaying = false;
    rooms[currentRoom].currentTime = data.currentTime;
    socket.to(currentRoom).emit('player_pause', data);
  });

  socket.on('player_seek', (data) => {
    if (!currentRoom || !rooms[currentRoom]) return;
    rooms[currentRoom].currentTime = data.currentTime;
    socket.to(currentRoom).emit('player_seek', data);
  });

  socket.on('change_video', (data) => {
    if (!currentRoom || !rooms[currentRoom]) return;
    rooms[currentRoom].videoId = data.videoId;
    rooms[currentRoom].currentTime = 0;
    rooms[currentRoom].isPlaying = true;
    io.in(currentRoom).emit('change_video', data);
  });
});

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
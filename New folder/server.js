const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

app.use(express.static(__dirname));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  const publicIndex = path.join(__dirname, 'public', 'index.html');
  const directIndex = path.join(__dirname, 'index.html');

  if (fs.existsSync(publicIndex)) {
    return res.sendFile(publicIndex);
  } else if (fs.existsSync(directIndex)) {
    return res.sendFile(directIndex);
  } else {
    res.status(404).send('index.html not found! Make sure index.html is saved.');
  }
});

// Dictionary storing isolated room states
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

  // 1. Host creates a brand new isolated room
  socket.on('create_room', (data) => {
    const pin = generatePin();
    currentRoom = pin;
    socket.join(pin);

    rooms[pin] = {
      videoId: data.videoId || 'dQw4w9WgXcQ',
      currentTime: 0,
      isPlaying: true,
      lastUpdated: Date.now()
    };

    socket.emit('room_created', { pin, roomState: rooms[pin] });
  });

  // 2. Friend joins an existing room via PIN
  socket.on('join_room', (pin) => {
    if (rooms[pin]) {
      currentRoom = pin;
      socket.join(pin);
      socket.emit('room_joined', { pin, roomState: rooms[pin] });
    } else {
      socket.emit('join_error', 'Invalid PIN! Room does not exist.');
    }
  });

  // 3. Isolated synchronization within the specific room
  socket.on('player_play', (data) => {
    if (!currentRoom || !rooms[currentRoom]) return;
    rooms[currentRoom].isPlaying = true;
    rooms[currentRoom].currentTime = data.currentTime;
    rooms[currentRoom].lastUpdated = Date.now();
    socket.to(currentRoom).emit('player_play', data);
  });

  socket.on('player_pause', (data) => {
    if (!currentRoom || !rooms[currentRoom]) return;
    rooms[currentRoom].isPlaying = false;
    rooms[currentRoom].currentTime = data.currentTime;
    rooms[currentRoom].lastUpdated = Date.now();
    socket.to(currentRoom).emit('player_pause', data);
  });

  socket.on('player_seek', (data) => {
    if (!currentRoom || !rooms[currentRoom]) return;
    rooms[currentRoom].currentTime = data.currentTime;
    rooms[currentRoom].lastUpdated = Date.now();
    socket.to(currentRoom).emit('player_seek', data);
  });

  socket.on('change_video', (data) => {
    if (!currentRoom || !rooms[currentRoom]) return;
    rooms[currentRoom].videoId = data.videoId;
    rooms[currentRoom].currentTime = 0;
    rooms[currentRoom].isPlaying = true;
    rooms[currentRoom].lastUpdated = Date.now();
    io.in(currentRoom).emit('change_video', data);
  });

  socket.on('disconnect', () => {
    // Leave room automatically on disconnect
  });
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
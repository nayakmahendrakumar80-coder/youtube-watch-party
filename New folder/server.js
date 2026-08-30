const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;
const ROOM_PIN = "1234"; // <-- Change your desired Room PIN here

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

let roomState = {
  videoId: 'M7lc1UVf-VE',
  currentTime: 0,
  isPlaying: false,
  lastUpdated: Date.now()
};

io.on('connection', (socket) => {
  // Verify PIN before giving access to the room
  socket.on('join_with_pin', (pin) => {
    if (pin === ROOM_PIN) {
      socket.emit('pin_success');
      socket.emit('sync_state', roomState);
    } else {
      socket.emit('pin_error', 'Incorrect PIN. Access denied.');
    }
  });

  socket.on('player_play', (data) => {
    roomState.isPlaying = true;
    roomState.currentTime = data.currentTime;
    roomState.lastUpdated = Date.now();
    socket.broadcast.emit('player_play', data);
  });

  socket.on('player_pause', (data) => {
    roomState.isPlaying = false;
    roomState.currentTime = data.currentTime;
    roomState.lastUpdated = Date.now();
    socket.broadcast.emit('player_pause', data);
  });

  socket.on('player_seek', (data) => {
    roomState.currentTime = data.currentTime;
    roomState.lastUpdated = Date.now();
    socket.broadcast.emit('player_seek', data);
  });

  socket.on('change_video', (data) => {
    roomState.videoId = data.videoId;
    roomState.currentTime = 0;
    roomState.isPlaying = true;
    roomState.lastUpdated = Date.now();
    io.emit('change_video', data);
  });
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
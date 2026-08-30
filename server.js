const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// Serve static assets from both current directory and public folder
app.use(express.static(__dirname));
app.use(express.static(path.join(__dirname, 'public')));

// Explicit route for homepage
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
  socket.emit('sync_state', roomState);

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
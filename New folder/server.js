const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname)));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

const rooms = {};

io.on('connection', (socket) => {
  socket.on('join_room', (data) => {
    const { pin, videoId, isHost } = data;
    socket.join(pin);

    if (isHost || !rooms[pin]) {
      rooms[pin] = {
        videoId: videoId || 'dQw4w9WgXcQ',
        currentTime: 0,
        isPlaying: true
      };
    } else {
      socket.emit('sync_initial_state', rooms[pin]);
    }
  });

  socket.on('player_play', (data) => {
    if (data.room && rooms[data.room]) {
      rooms[data.room].isPlaying = true;
      rooms[data.room].currentTime = data.currentTime;
    }
    socket.to(data.room).emit('player_play', data);
  });

  socket.on('player_pause', (data) => {
    if (data.room && rooms[data.room]) {
      rooms[data.room].isPlaying = false;
      rooms[data.room].currentTime = data.currentTime;
    }
    socket.to(data.room).emit('player_pause', data);
  });

  socket.on('change_video', (data) => {
    if (data.room && rooms[data.room]) {
      rooms[data.room].videoId = data.videoId;
      rooms[data.room].currentTime = 0;
      rooms[data.room].isPlaying = true;
    }
    io.in(data.room).emit('change_video', data);
  });
});

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
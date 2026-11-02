import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { connectDB } from './config/db.js';
import authRoutes from './routes/auth.js';
import profileRoutes from './routes/profile.js';
import peersRoutes from './routes/peers.js';
import sessionsRoutes from './routes/sessions.js';
import notificationsRoutes from './routes/notifications.js';
import reviewsRoutes from './routes/reviews.js';
import creditsRoutes from './routes/credits.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

app.use(cors());
app.use(express.json());

app.set('io', io);

connectDB();

app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/peers', peersRoutes);
app.use('/api/sessions', sessionsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/reviews', reviewsRoutes);
app.use('/api/credits', creditsRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const userSockets = new Map();

io.on('connection', (socket) => {
  const userId = socket.handshake.auth.userId;
  if (userId) {
    userSockets.set(userId, socket.id);
    socket.join(`user:${userId}`);
    console.log(`User connected: ${userId}`);
  }

  socket.on('join-session', (sessionId) => {
    socket.join(`session:${sessionId}`);
    socket.to(`session:${sessionId}`).emit('user-joined', { userId, socketId: socket.id });
  });

  socket.on('leave-session', (sessionId) => {
    socket.leave(`session:${sessionId}`);
    socket.to(`session:${sessionId}`).emit('user-left', { userId });
  });

  socket.on('webrtc-offer', (data) => {
    socket.to(`session:${data.sessionId}`).emit('webrtc-offer', data);
  });

  socket.on('webrtc-answer', (data) => {
    socket.to(`session:${data.sessionId}`).emit('webrtc-answer', data);
  });

  socket.on('webrtc-ice-candidate', (data) => {
    socket.to(`session:${data.sessionId}`).emit('webrtc-ice-candidate', data);
  });

  socket.on('chat-message', (data) => {
    io.to(`session:${data.sessionId}`).emit('chat-message', {
      ...data,
      senderId: userId,
      timestamp: new Date().toISOString()
    });
  });

  socket.on('whiteboard-draw', (data) => {
    socket.to(`session:${data.sessionId}`).emit('whiteboard-draw', data);
  });

  socket.on('whiteboard-clear', (data) => {
    socket.to(`session:${data.sessionId}`).emit('whiteboard-clear', data);
  });

  socket.on('screen-share-start', (data) => {
    socket.to(`session:${data.sessionId}`).emit('screen-share-start', { userId });
  });

  socket.on('screen-share-stop', (data) => {
    socket.to(`session:${data.sessionId}`).emit('screen-share-stop', { userId });
  });

  socket.on('disconnect', () => {
    if (userId) {
      userSockets.delete(userId);
      console.log(`User disconnected: ${userId}`);
    }
  });
});

export const getIO = () => io;
export const getUserSocket = (userId) => userSockets.get(userId);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

const PORT = process.env.PORT || 5001;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
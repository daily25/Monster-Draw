import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { ClientEvents, ServerEvents } from 'monster-draw-shared';
import { registerGameHandlers } from './socket/gameHandler';

const app = express();
const httpServer = createServer(app);

const io = new Server<ClientEvents, ServerEvents>(httpServer, {
  cors: {
    origin: process.env.NODE_ENV === 'production' ? false : ['http://localhost:5173'],
    methods: ['GET', 'POST'],
  },
  maxHttpBufferSize: 5e6, // 5MB to handle base64 fold zone images
});

app.use(cors());

// In production, serve the built client
if (process.env.NODE_ENV === 'production') {
  const clientDist = path.join(__dirname, '../../client/dist');
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);
  registerGameHandlers(io, socket as any);
});

const PORT = parseInt(process.env.PORT || '8080', 10);
httpServer.listen(PORT, () => {
  console.log(`Monster Draw server running on port ${PORT}`);
});

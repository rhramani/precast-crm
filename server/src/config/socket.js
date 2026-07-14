const { Server } = require('socket.io');

let io = null;

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: [process.env.CLIENT_URL || 'http://localhost:5173', 'http://localhost:5174'],
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);

    socket.on('join_branch', (branchId) => {
      if (branchId) {
        // Clean up previous branch rooms first
        const rooms = Array.from(socket.rooms);
        rooms.forEach((room) => {
          if (room.startsWith('branch_') && room !== `branch_${branchId}`) {
            socket.leave(room);
            console.log(`👤 Socket ${socket.id} left room: ${room}`);
          }
        });

        socket.join(`branch_${branchId}`);
        console.log(`👤 Socket ${socket.id} joined room: branch_${branchId}`);
      }
    });

    socket.on('join_super_admin', () => {
      socket.join('super_admin');
      console.log(`👤 Socket ${socket.id} joined room: super_admin`);
    });

    socket.on('disconnect', () => {
      console.log(`🔌 Socket disconnected: ${socket.id}`);
    });
  });

  return io;
};

const getIO = () => {
  return io;
};

const emitToBranch = (branchId, event, data) => {
  if (io) {
    if (branchId) {
      io.to(`branch_${branchId}`).emit(event, data);
    }
    // Always push notification to super admins
    io.to('super_admin').emit(event, data);
  }
};

module.exports = {
  initSocket,
  getIO,
  emitToBranch,
};

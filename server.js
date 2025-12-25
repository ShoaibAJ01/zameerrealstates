const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/properties', require('./routes/properties'));
app.use('/api/subscriptions', require('./routes/subscriptions'));
app.use('/api/users', require('./routes/users'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/feedback', require('./routes/feedback'));

// MongoDB Connection with timeout and retry options
mongoose.connect(process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 30000, // Increase timeout to 30 seconds
  socketTimeoutMS: 45000,
  family: 4 // Force IPv4
})
.then(() => console.log('MongoDB Connected'))
.catch(err => {
  console.log('MongoDB Connection Error:', err);
  // Retry connection after 5 seconds
  setTimeout(() => {
    mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      family: 4
    }).catch(console.error);
  }, 5000);
});

// Socket.IO for real-time chat
const { Chat, Message } = require('./models/Chat');
const User = require('./models/User');

// Store online users
const onlineUsers = new Map();

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Authenticate socket connection
  socket.on('authenticate', async (token) => {
    try {
      console.log('Authenticating with token:', token ? 'Token present' : 'No token');
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('Decoded token:', decoded);
      socket.userId = decoded.userId;
      socket.join(`user_${decoded.userId}`);
      
      // Mark user as online
      onlineUsers.set(decoded.userId, socket.id);
      io.emit('user_online', { userId: decoded.userId });
      
      // Send authentication success back to the client
      socket.emit('authenticated', { userId: decoded.userId, success: true });
      
      console.log(`User ${decoded.userId} authenticated and online`);
    } catch (error) {
      console.error('Socket authentication error:', error);
      socket.emit('authenticated', { success: false, error: error.message });
    }
  });

  // Join chat room
  socket.on('join_chat', (chatId) => {
    socket.join(`chat_${chatId}`);
    console.log(`User joined chat: ${chatId}`);
  });
  
  // Check if user is online
  socket.on('check_user_online', ({ userId }) => {
    const isOnline = onlineUsers.has(userId);
    socket.emit(isOnline ? 'user_online' : 'user_offline', { userId });
    console.log(`User ${userId} is ${isOnline ? 'online' : 'offline'}`);
  });

  // Typing indicator
  socket.on('typing', (data) => {
    const { chatId, isTyping } = data;
    socket.to(`chat_${chatId}`).emit('user_typing', {
      userId: socket.userId,
      isTyping
    });
  });

  // Send message
  socket.on('send_message', async (data) => {
    try {
      const { chatId, message, messageType, fileUrl, fileName } = data;
      const userId = socket.userId;

      // Verify user is part of the chat
      const chat = await Chat.findById(chatId);
      if (!chat || !chat.participants.includes(userId)) {
        return;
      }

      // Create message
      const newMessage = new Message({
        chatId,
        sender: userId,
        message: message || '',
        messageType: messageType || 'text',
        fileUrl,
        fileName
      });
      await newMessage.save();

      // Update chat
      chat.lastMessage = message || (messageType === 'image' ? '📷 Image' : messageType === 'voice' ? '🎤 Voice message' : '📎 File');
      chat.lastMessageTime = new Date();
      
      // Increment unread count for other participants
      chat.participants.forEach(participantId => {
        if (participantId.toString() !== userId.toString()) {
          const currentCount = chat.unreadCount.get(participantId.toString()) || 0;
          chat.unreadCount.set(participantId.toString(), currentCount + 1);
        }
      });
      
      await chat.save();

      // Populate sender info
      const populatedMessage = await Message.findById(newMessage._id)
        .populate('sender', 'name email role');

      // Emit to all users in chat room
      io.to(`chat_${chatId}`).emit('new_message', populatedMessage);
      
      // Emit chat update to participants
      chat.participants.forEach(participantId => {
        io.to(`user_${participantId}`).emit('chat_updated', {
          chatId,
          lastMessage: chat.lastMessage,
          lastMessageTime: chat.lastMessageTime
        });
      });
    } catch (error) {
      console.error('Send message error:', error);
    }
  });

  // Edit message
  socket.on('edit_message', async (data) => {
    try {
      const { messageId, newMessage } = data;
      const userId = socket.userId;

      if (!userId || !messageId || !newMessage) {
        console.error('Edit message: Missing data');
        return;
      }

      const msg = await Message.findById(messageId);
      if (!msg || msg.sender.toString() !== userId.toString() || msg.deleted) {
        return;
      }

      msg.message = newMessage;
      msg.edited = true;
      msg.editedAt = new Date();
      await msg.save();

      const updatedMsg = await Message.findById(messageId).populate('sender', 'name email role');
      io.to(`chat_${msg.chatId}`).emit('message_edited', updatedMsg);
    } catch (error) {
      console.error('Edit message error:', error);
    }
  });

  // Delete message
  socket.on('delete_message', async (data) => {
    try {
      const { messageId } = data;
      const userId = socket.userId;

      if (!userId || !messageId) {
        console.error('Delete message: Missing data');
        return;
      }

      const msg = await Message.findById(messageId);
      if (!msg || msg.sender.toString() !== userId.toString()) {
        return;
      }

      msg.deleted = true;
      msg.deletedAt = new Date();
      msg.message = '';
      await msg.save();

      const updatedMsg = await Message.findById(messageId).populate('sender', 'name email role');
      io.to(`chat_${msg.chatId}`).emit('message_deleted', updatedMsg);
    } catch (error) {
      console.error('Delete message error:', error);
    }
  });

  // WebRTC Call Signaling
  socket.on('call-user', (data) => {
    const { userToCall, signalData, from, name, callType } = data;
    const targetSocketId = onlineUsers.get(userToCall);
    if (targetSocketId) {
      io.to(targetSocketId).emit('incoming-call', {
        signal: signalData,
        from,
        name,
        callType
      });
    }
  });

  socket.on('accept-call', (data) => {
    const { signal, to } = data;
    const targetSocketId = onlineUsers.get(to);
    if (targetSocketId) {
      io.to(targetSocketId).emit('call-accepted', signal);
    }
  });

  socket.on('reject-call', (data) => {
    const { to } = data;
    const targetSocketId = onlineUsers.get(to);
    if (targetSocketId) {
      io.to(targetSocketId).emit('call-rejected');
    }
  });

  socket.on('end-call', (data) => {
    const { to } = data;
    const targetSocketId = onlineUsers.get(to);
    if (targetSocketId) {
      io.to(targetSocketId).emit('call-ended');
    }
  });

  socket.on('ice-candidate', (data) => {
    const { candidate, to } = data;
    const targetSocketId = onlineUsers.get(to);
    if (targetSocketId) {
      io.to(targetSocketId).emit('ice-candidate', { candidate });
    }
  });

  // Mark messages as read
  socket.on('mark_read', async (data) => {
    try {
      const { chatId } = data;
      const userId = socket.userId;
      
      if (!userId || !chatId) {
        console.error('Mark read: Missing userId or chatId');
        return;
      }
      
      const messages = await Message.updateMany(
        { chatId, sender: { $ne: userId }, read: false },
        { read: true, readAt: new Date() }
      );

      const chat = await Chat.findById(chatId);
      if (chat) {
        chat.unreadCount.set(userId.toString(), 0);
        await chat.save();
      }

      // Notify sender that messages were read
      io.to(`chat_${chatId}`).emit('messages_read', { 
        userId,
        chatId,
        readAt: new Date()
      });
    } catch (error) {
      console.error('Mark read error:', error);
    }
  });

  // Get online users
  socket.on('get_online_users', () => {
    const onlineUserIds = Array.from(onlineUsers.keys());
    socket.emit('online_users', onlineUserIds);
  });

  socket.on('disconnect', () => {
    if (socket.userId) {
      onlineUsers.delete(socket.userId);
      io.emit('user_offline', { userId: socket.userId });
      console.log(`User ${socket.userId} disconnected and offline`);
    }
  });
});

// Basic route
app.get('/', (req, res) => {
  res.json({ message: 'Real Estate SaaS API' });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

const express = require('express');
const router = express.Router();
const { Chat, Message } = require('../models/Chat');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

// Get or create chat with admin
router.post('/start', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Find admin user
    const admin = await User.findOne({ role: 'admin' });
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    // Check if chat already exists
    let chat = await Chat.findOne({
      participants: { $all: [userId, admin._id] }
    }).populate('participants', 'name email role');

    // Create new chat if doesn't exist
    if (!chat) {
      chat = new Chat({
        participants: [userId, admin._id],
        unreadCount: {
          [userId]: 0,
          [admin._id]: 0
        }
      });
      await chat.save();
      chat = await Chat.findById(chat._id).populate('participants', 'name email role');
    }

    res.json(chat);
  } catch (error) {
    console.error('Start chat error:', error);
    res.status(500).json({ message: 'Error starting chat' });
  }
});

// Get all chats for current user
router.get('/my-chats', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const chats = await Chat.find({
      participants: userId
    })
    .populate('participants', 'name email role phone')
    .sort({ lastMessageTime: -1 });

    res.json(chats);
  } catch (error) {
    console.error('Get chats error:', error);
    res.status(500).json({ message: 'Error fetching chats' });
  }
});

// Get messages for a specific chat
router.get('/:chatId/messages', auth, async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user.id;

    // Verify user is part of the chat
    const chat = await Chat.findById(chatId);
    if (!chat || !chat.participants.includes(userId)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const messages = await Message.find({ chatId })
      .populate('sender', 'name email role')
      .sort({ createdAt: 1 });

    // Mark messages as read
    await Message.updateMany(
      { chatId, sender: { $ne: userId }, read: false },
      { read: true }
    );

    // Reset unread count for this user
    chat.unreadCount.set(userId.toString(), 0);
    await chat.save();

    res.json(messages);
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ message: 'Error fetching messages' });
  }
});

// Send a message
router.post('/:chatId/message', auth, async (req, res) => {
  try {
    const { chatId } = req.params;
    const { message } = req.body;
    const userId = req.user.id;

    // Verify user is part of the chat
    const chat = await Chat.findById(chatId);
    if (!chat || !chat.participants.includes(userId)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Create message
    const newMessage = new Message({
      chatId,
      sender: userId,
      message
    });
    await newMessage.save();

    // Update chat
    chat.lastMessage = message;
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

    res.json(populatedMessage);
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ message: 'Error sending message' });
  }
});

// Get admin's all chats
router.get('/admin/all-chats', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const chats = await Chat.find({})
      .populate('participants', 'name email role phone')
      .populate('assignedTo', 'name email')
      .sort({ lastMessageTime: -1 });

    res.json(chats);
  } catch (error) {
    console.error('Get admin chats error:', error);
    res.status(500).json({ message: 'Error fetching chats' });
  }
});

// Edit message
router.patch('/message/:messageId', auth, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { message } = req.body;
    const userId = req.user.id;

    const msg = await Message.findById(messageId);
    if (!msg) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Only sender can edit
    if (msg.sender.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'Not authorized to edit this message' });
    }

    // Can't edit deleted messages
    if (msg.deleted) {
      return res.status(400).json({ message: 'Cannot edit deleted message' });
    }

    msg.message = message;
    msg.edited = true;
    msg.editedAt = new Date();
    await msg.save();

    const updatedMsg = await Message.findById(messageId).populate('sender', 'name email role');
    res.json(updatedMsg);
  } catch (error) {
    console.error('Edit message error:', error);
    res.status(500).json({ message: 'Error editing message' });
  }
});

// Delete message
router.delete('/message/:messageId', auth, async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.id;

    const msg = await Message.findById(messageId);
    if (!msg) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Only sender can delete
    if (msg.sender.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this message' });
    }

    msg.deleted = true;
    msg.deletedAt = new Date();
    msg.message = '';
    await msg.save();

    const updatedMsg = await Message.findById(messageId).populate('sender', 'name email role');
    res.json(updatedMsg);
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ message: 'Error deleting message' });
  }
});

// Assign chat to admin/agent
router.patch('/:chatId/assign', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { chatId } = req.params;
    const { assignedTo } = req.body;

    const chat = await Chat.findByIdAndUpdate(
      chatId,
      { assignedTo },
      { new: true }
    )
    .populate('participants', 'name email role phone')
    .populate('assignedTo', 'name email');

    res.json(chat);
  } catch (error) {
    console.error('Assign chat error:', error);
    res.status(500).json({ message: 'Error assigning chat' });
  }
});

module.exports = router;

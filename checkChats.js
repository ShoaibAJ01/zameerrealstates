const mongoose = require('mongoose');
const { Chat } = require('./models/Chat');
const User = require('./models/User');

mongoose.connect('mongodb+srv://shoaibaj:admin@cluster0.mk40qlv.mongodb.net/realestatesaas')
  .then(async () => {
    console.log('Connected to MongoDB');
    
    const chats = await Chat.find().populate('participants', 'name email role');
    
    console.log('\n=== Total Chats:', chats.length, '===\n');
    
    chats.forEach((chat, i) => {
      console.log(`Chat ${i + 1}: ${chat._id}`);
      console.log('Participants:');
      chat.participants.forEach(p => {
        console.log(`  - ${p.name} (${p.email}) [${p.role}]`);
      });
      console.log('Last Message:', chat.lastMessage || 'No messages yet');
      console.log('---');
    });
    
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });

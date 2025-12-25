require('dotenv').config();
const mongoose = require('mongoose');

console.log('Testing MongoDB connection...');
console.log('MongoDB URI:', process.env.MONGODB_URI.replace(/:[^:]*@/, ':****@'));

mongoose.connect(process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 30000,
  socketTimeoutMS: 45000,
  family: 4
})
.then(() => {
  console.log('✓ MongoDB Connected Successfully!');
  mongoose.connection.close();
  process.exit(0);
})
.catch(err => {
  console.error('✗ MongoDB Connection Failed:', err.message);
  console.error('\nTroubleshooting steps:');
  console.error('1. Check MongoDB Atlas IP whitelist');
  console.error('2. Verify cluster is running (not paused)');
  console.error('3. Check your internet connection');
  console.error('4. Try flushing DNS: ipconfig /flushdns');
  console.error('5. Disable firewall/antivirus temporarily');
  process.exit(1);
});

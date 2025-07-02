const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/notemaker');

// User Schema (simple version)
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

async function createTestUser() {
  try {
    console.log('🔍 Testing database connection...');
    
    // Check if user already exists
    const existingUser = await User.findOne({ email: 'test@example.com' });
    if (existingUser) {
      console.log('✅ Test user already exists');
      await testLogin(existingUser);
      return;
    }
    
    // Create test user
    console.log('📝 Creating test user...');
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    const user = new User({
      email: 'test@example.com',
      password: hashedPassword
    });
    
    await user.save();
    console.log('✅ Test user created successfully:', user.email);
    
    await testLogin(user);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    mongoose.connection.close();
  }
}

async function testLogin(user) {
  console.log('🔐 Testing password verification...');
  
  // Test correct password
  const correctPassword = await bcrypt.compare('password123', user.password);
  console.log('✅ Correct password test:', correctPassword ? 'PASS' : 'FAIL');
  
  // Test wrong password
  const wrongPassword = await bcrypt.compare('wrongpassword', user.password);
  console.log('❌ Wrong password test:', wrongPassword ? 'FAIL (should be false)' : 'PASS');
  
  console.log('📊 User info:', {
    id: user._id,
    email: user.email,
    passwordHash: user.password.substring(0, 20) + '...'
  });
}

// Run the test
createTestUser(); 
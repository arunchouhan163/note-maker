const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/notemaker');

// User Schema
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

// Note Schema
const noteSchema = new mongoose.Schema({
  title: { type: String, required: true },
  items: { type: [String], default: [] },
  completedItems: { type: [Number], default: [] },
  tags: { type: [String], default: [] },
  backgroundColor: { type: String, default: '#ffffff' },
  dueDate: { type: Date },
  userId: { type: String, required: true },
  isArchived: { type: Boolean, default: false },
  isTrashed: { type: Boolean, default: false },
  trashedAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Note = mongoose.model('Note', noteSchema);

async function testTrashCleanup() {
  try {
    console.log('🧪 Testing Trash Cleanup Functionality\n');

    // Create test user if doesn't exist
    let testUser = await User.findOne({ email: 'cleanup-test@example.com' });
    if (!testUser) {
      console.log('👤 Creating test user...');
      const hashedPassword = await bcrypt.hash('password123', 10);
      testUser = new User({
        email: 'cleanup-test@example.com',
        password: hashedPassword
      });
      await testUser.save();
      console.log('✅ Test user created');
    }

    // Create test notes with various trash dates
    console.log('📝 Creating test notes...');
    
    const now = new Date();
    const dates = [
      new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000), // 45 days ago (should be deleted)
      new Date(now.getTime() - 35 * 24 * 60 * 60 * 1000), // 35 days ago (should be deleted)
      new Date(now.getTime() - 25 * 24 * 60 * 60 * 1000), // 25 days ago (should remain)
      new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000), // 15 days ago (should remain)
      new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),  // 5 days ago (should remain)
    ];

    const testNotes = [];
    for (let i = 0; i < dates.length; i++) {
      const note = new Note({
        title: `Test Trashed Note ${i + 1}`,
        items: [`Task ${i + 1}`],
        userId: testUser._id.toString(),
        isTrashed: true,
        trashedAt: dates[i]
      });
      await note.save();
      testNotes.push(note);
    }
    
    console.log(`✅ Created ${testNotes.length} test notes`);

    // Show current trash stats
    console.log('\n📊 Current Trash Stats:');
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const [total, recent, expired] = await Promise.all([
      Note.countDocuments({ isTrashed: true }),
      Note.countDocuments({ 
        isTrashed: true, 
        trashedAt: { $gte: thirtyDaysAgo }
      }),
      Note.countDocuments({ 
        isTrashed: true, 
        trashedAt: { $lt: thirtyDaysAgo }
      })
    ]);
    
    console.log(`   • Total trashed notes: ${total}`);
    console.log(`   • Notes within 30 days: ${recent}`);
    console.log(`   • Notes older than 30 days: ${expired}`);

    // Test manual cleanup
    console.log('\n🗑️  Testing cleanup functionality...');
    console.log(`Deleting notes trashed before: ${thirtyDaysAgo.toISOString()}`);
    
    const result = await Note.deleteMany({
      isTrashed: true,
      trashedAt: { $lt: thirtyDaysAgo }
    });
    
    console.log(`✅ Deleted ${result.deletedCount} expired notes`);

    // Show stats after cleanup
    console.log('\n📊 Stats After Cleanup:');
    const [totalAfter, recentAfter, expiredAfter] = await Promise.all([
      Note.countDocuments({ isTrashed: true }),
      Note.countDocuments({ 
        isTrashed: true, 
        trashedAt: { $gte: thirtyDaysAgo }
      }),
      Note.countDocuments({ 
        isTrashed: true, 
        trashedAt: { $lt: thirtyDaysAgo }
      })
    ]);
    
    console.log(`   • Total trashed notes: ${totalAfter}`);
    console.log(`   • Notes within 30 days: ${recentAfter}`);
    console.log(`   • Notes older than 30 days: ${expiredAfter}`);

    if (expiredAfter === 0) {
      console.log('\n🎉 Cleanup test PASSED! All expired notes were properly deleted.');
    } else {
      console.log('\n❌ Cleanup test FAILED! Some expired notes remain.');
    }

    // Show remaining notes
    const remainingNotes = await Note.find({ isTrashed: true }).select('title trashedAt');
    if (remainingNotes.length > 0) {
      console.log('\n📋 Remaining trashed notes:');
      remainingNotes.forEach(note => {
        const daysAgo = Math.floor((now - note.trashedAt) / (1000 * 60 * 60 * 24));
        console.log(`   • ${note.title} (${daysAgo} days ago)`);
      });
    }

    console.log('\n✅ Test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    mongoose.connection.close();
  }
}

// Run the test
testTrashCleanup(); 
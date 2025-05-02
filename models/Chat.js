import mongoose from 'mongoose';

// Add index initialization function
const ensureIndexes = async () => {
  try {
    const Chat = mongoose.model('Chat');
    
    // Check if we need to update indexes
    const indexes = await Chat.collection.getIndexes();
    const hasCorrectIndex = indexes['participants.0_1_participants.1_1'];
    
    if (!hasCorrectIndex) {
      console.log('🔄 Updating chat indexes...');
      
      // Drop any existing participants indexes
      for (const indexName in indexes) {
        if (indexName.startsWith('participants')) {
          await Chat.collection.dropIndex(indexName).catch(() => {});
        }
      }
      
      // Create the new compound index
      await Chat.collection.createIndex(
        { 'participants.0': 1, 'participants.1': 1 },
        { 
          unique: true,
          background: true // Allow index creation in background
        }
      );
      
      console.log('✅ Chat indexes updated successfully');
    }
  } catch (error) {
    console.error('Error updating chat indexes:', error);
  }
};

const MessageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: [true, 'Message content is required'],
    trim: true
  },
  isBargain: {
    type: Boolean,
    default: false
  },
  isAIMessage: {
    type: Boolean,
    default: false
  },
  bargainDetails: {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product'
    },
    originalPrice: Number,
    offeredPrice: Number,
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default: 'pending'
    }
  },
  readBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  readAt: Date,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const ChatSchema = new mongoose.Schema({
  participants: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  ],
  messages: [MessageSchema],
  lastMessage: {
    content: String,
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Force participants to be exactly 2 people
ChatSchema.path('participants').validate(function(participants) {
  return participants.length === 2;
}, 'Chat must have exactly 2 participants');

// Update updatedAt timestamp on save
ChatSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  // Update last message if new messages are added
  if (this.messages.length > 0) {
    const lastMsg = this.messages[this.messages.length - 1];
    this.lastMessage = {
      content: lastMsg.content,
      sender: lastMsg.sender,
      createdAt: lastMsg.createdAt
    };
  }
  
  next();
});

// Populate participants
ChatSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'participants',
    select: 'name image role'
  }).populate({
    path: 'messages.sender',
    select: 'name image role'
  }).populate({
    path: 'lastMessage.sender',
    select: 'name image role'
  });
  
  next();
});

const Chat = mongoose.model('Chat', ChatSchema);

// Call ensureIndexes when the model is first loaded
ensureIndexes().catch(console.error);

export default Chat; 
import mongoose from 'mongoose';

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

// Ensure unique chats between same participants
ChatSchema.index({ participants: 1 }, { unique: true });

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

export default Chat; 
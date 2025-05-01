import Chat from '../models/Chat.js';
import User from '../models/User.js';
import Product from '../models/Product.js';
import { sendNotification } from '../utils/sendNotification.js';
import * as chatService from '../services/chatService.js';

// @desc    Get all chats for the current user
// @route   GET /api/v1/chats
// @access  Private
export const getChats = async (req, res, next) => {
  try {
    // Find all chats where the user is a participant
    const chats = await Chat.find({
      participants: { $in: [req.user.id] }
    })
      .sort('-updatedAt')
      .populate('participants', 'name image role')
      .populate('lastMessage.sender', 'name image role');
    
    res.status(200).json({
      success: true,
      count: chats.length,
      data: chats
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single chat
// @route   GET /api/v1/chats/:id
// @access  Private
export const getChat = async (req, res, next) => {
  try {
    const chat = await Chat.findById(req.params.id);
    
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }
    
    // Check if user is a participant
    if (!chat.participants.some(p => p.toString() === req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this chat'
      });
    }
    
    // Mark messages as read
    await chatService.markMessagesAsRead({
      chatId: chat._id,
      userId: req.user.id
    });
    
    res.status(200).json({
      success: true,
      data: chat
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create or get chat with another user
// @route   POST /api/v1/chats
// @access  Private
export const createChat = async (req, res, next) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }
    
    // Check if the target user exists
    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Get or create chat
    const chat = await chatService.getOrCreateChat(req.user.id, userId);
    
    res.status(200).json({
      success: true,
      data: chat
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Send message
// @route   POST /api/v1/chats/:id/messages
// @access  Private
export const sendMessage = async (req, res, next) => {
  try {
    const { content, isBargain, productId, offeredPrice } = req.body;
    
    if (!content) {
      return res.status(400).json({
        success: false,
        message: 'Message content is required'
      });
    }
    
    const chat = await Chat.findById(req.params.id);
    
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }
    
    // Check if user is a participant
    if (!chat.participants.some(p => p.toString() === req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to send messages in this chat'
      });
    }
    
    let bargainDetails;
    
    // Handle bargain messages
    if (isBargain && productId) {
      // Validate product
      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }
      
      if (!offeredPrice) {
        return res.status(400).json({
          success: false,
          message: 'Offered price is required for bargain messages'
        });
      }
      
      bargainDetails = {
        productId,
        originalPrice: product.price,
        offeredPrice,
        status: 'pending'
      };
    }
    
    // Send message
    const updatedChat = await chatService.sendMessage({
      chatId: chat._id,
      senderId: req.user.id,
      content,
      isBargain: !!isBargain,
      bargainDetails
    });
    
    res.status(200).json({
      success: true,
      data: updatedChat
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Respond to bargain
// @route   POST /api/v1/chats/:id/bargain/:messageId
// @access  Private
export const respondToBargain = async (req, res, next) => {
  try {
    const { response } = req.body;
    const { id: chatId, messageId } = req.params;
    
    if (!response || !['accepted', 'rejected'].includes(response)) {
      return res.status(400).json({
        success: false,
        message: 'Response must be "accepted" or "rejected"'
      });
    }
    
    const chat = await Chat.findById(chatId);
    
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }
    
    // Check if user is a participant
    if (!chat.participants.some(p => p.toString() === req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to respond in this chat'
      });
    }
    
    // Find the message
    const message = chat.messages.id(messageId);
    
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }
    
    // Check if message is a bargain
    if (!message.isBargain) {
      return res.status(400).json({
        success: false,
        message: 'This message is not a bargain offer'
      });
    }
    
    // Check if user is not the sender of the bargain
    if (message.sender.toString() === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot respond to your own bargain offer'
      });
    }
    
    // Respond to bargain
    const updatedChat = await chatService.respondToBargain({
      chatId,
      messageId,
      responderId: req.user.id,
      response
    });
    
    res.status(200).json({
      success: true,
      data: updatedChat
    });
  } catch (error) {
    next(error);
  }
}; 
import express from 'express';
import { 
  getChats, 
  getChat, 
  createChat, 
  sendMessage, 
  respondToBargain 
} from '../controllers/chatController.js';
import { protect } from '../middlewares/auth.js';

const router = express.Router();

// All chat routes are protected
router.use(protect);

router.route('/')
  .get(getChats)
  .post(createChat);

router.route('/:id')
  .get(getChat);

router.route('/:id/messages')
  .post(sendMessage);

router.route('/:id/bargain/:messageId')
  .post(respondToBargain);

export default router; 
import express from 'express';
import { 
  getNotifications, 
  markAsRead, 
  markAllAsRead, 
  deleteNotification, 
  deleteAllNotifications, 
  sendNotificationHandler,
  sendBulkNotificationsHandler
} from '../controllers/notificationController.js';
import { protect, authorize } from '../middlewares/auth.js';

const router = express.Router();

// All notification routes are protected
router.use(protect);

router.route('/')
  .get(getNotifications)
  .post(authorize('admin'), sendNotificationHandler)
  .delete(deleteAllNotifications);

router.route('/read-all')
  .put(markAllAsRead);

router.route('/bulk')
  .post(authorize('admin'), sendBulkNotificationsHandler);

router.route('/:id')
  .delete(deleteNotification);

router.route('/:id/read')
  .put(markAsRead);

export default router; 
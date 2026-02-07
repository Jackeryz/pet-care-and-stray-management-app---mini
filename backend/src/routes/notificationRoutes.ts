import express from 'express';
import { listNotifications } from '../controllers/notificationController';
import { authenticate } from '../middlewares/auth';

const router = express.Router();

router.get('/', authenticate, listNotifications);

export default router;

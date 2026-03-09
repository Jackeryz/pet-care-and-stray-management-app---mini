import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import { listNotificationsForNgo } from '../database/sqliteSetup';

export const listNotifications = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    if (!user || (user.role !== 'NGO' && user.role !== 'VET')) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const notifications = listNotificationsForNgo(user.id);
    res.json(notifications);
  } catch (err) {
    console.error('Failed to list notifications', err);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
};

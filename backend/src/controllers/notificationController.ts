import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import { listNotificationsForNgo } from '../database/sqliteSetup';

export const listNotifications = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    if (!user || user.role !== 'NGO') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const ngosNotifications = listNotificationsForNgo(user.id);
    res.json(ngosNotifications);
  } catch (err) {
    console.error('Failed to list notifications', err);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
};

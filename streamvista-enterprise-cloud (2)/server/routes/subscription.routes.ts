import { Router } from 'express';
import { verifyAuth } from '../middleware/auth.middleware';
export const router = Router();
router.post('/upgrade', verifyAuth, (req, res) => res.status(200).json({ message: 'Upgrade processed' }));

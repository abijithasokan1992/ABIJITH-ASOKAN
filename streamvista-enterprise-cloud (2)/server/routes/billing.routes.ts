import { Router } from 'express';
import { verifyAuth } from '../middleware/auth.middleware';
export const router = Router();
router.get('/info', verifyAuth, (req, res) => res.status(200).json({ plan: 'Basic', amount: 650 }));

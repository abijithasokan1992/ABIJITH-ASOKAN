import { Router } from 'express';
import { verifyAuth } from '../middleware/auth.middleware';
export const router = Router();
router.post('/', verifyAuth, (req, res) => res.status(201).json({ message: 'Folder created' }));
router.get('/', verifyAuth, (req, res) => res.status(200).json({ folders: [] }));

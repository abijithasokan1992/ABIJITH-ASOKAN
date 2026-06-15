import { Request, Response, NextFunction } from 'express';
export const verifyAuth = (req: Request, res: Response, next: NextFunction) => {
  const token = req.cookies?.token;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  next();
};

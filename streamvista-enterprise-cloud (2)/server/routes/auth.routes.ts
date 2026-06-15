import { Router } from 'express';
import { sendEmail } from '../services/email.service';
import { findUserByEmail, updatePassword, verifyEmail } from '../services/user.service';
import bcrypt from 'bcrypt';

export const router = Router();

router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  const user = await findUserByEmail(email);
  if (!user) return res.status(404).json({ error: 'User not found' });
  await sendEmail(email, 'RESET');
  res.status(200).json({ message: 'Reset email sent' });
});

router.post('/reset-password', async (req, res) => {
  const { email, newPassword } = req.body;
  const passwordHash = await bcrypt.hash(newPassword, 10);
  await updatePassword(email, passwordHash);
  res.status(200).json({ message: 'Password reset successful' });
});

router.post('/verify-email', async (req, res) => {
  const { email } = req.body;
  await verifyEmail(email);
  res.status(200).json({ message: 'Email verified' });
});

router.post('/logout', (req, res) => res.clearCookie('token').status(200).json({ message: 'Logged out' }));

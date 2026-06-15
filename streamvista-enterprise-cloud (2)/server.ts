import cookieParser from 'cookie-parser';
import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { initializeDatabase } from './server/db';
import { createUser, findUserByEmail } from './server/services/user.service';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { router as authRoutes } from './server/routes/auth.routes';
import { router as dashboardRoutes } from './server/routes/dashboard.routes';
import { router as folderRoutes } from './server/routes/folder.routes';
import { router as filesRoutes } from './server/routes/files.routes';
import { router as subscriptionRoutes } from './server/routes/subscription.routes';
import { router as billingRoutes } from './server/routes/billing.routes';
import { router as vaultRoutes } from './server/routes/vault.routes';
import { router as storageAnalyticsRoutes } from './server/routes/storage-analytics.routes';
import { router as deploymentRoutes } from './server/routes/deployment.routes';
import { router as hostingRoutes } from './server/routes/hosting.routes';
import { processWebhook } from './server/services/webhook.service';
import { checkGracePeriods } from './server/services/subscription.service';
import { enforceSubscription } from './server/middleware/subscription.middleware';
import { errorHandler } from './server/middleware/error-handler.middleware';

dotenv.config();

console.log('[CLOUD_X_INIT] Starting application...', {
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  PWD: process.cwd()
});

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

console.log('[CLOUD_X_INIT] Express initialized');

app.use(express.json());
app.use(cookieParser());


app.use('/api/auth/actions', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/folders', enforceSubscription, folderRoutes);
app.use('/api/files', enforceSubscription, filesRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/vault', enforceSubscription, vaultRoutes);
app.use('/api/storage', enforceSubscription, storageAnalyticsRoutes);
app.use('/api/deployments', enforceSubscription, deploymentRoutes);
app.use('/api/hosting', enforceSubscription, hostingRoutes);

// Razorpay Webhook
app.post('/api/webhooks/razorpay', express.json(), async (req, res) => {
    try {
        await processWebhook(req.body);
    } catch (e) {
        console.error('Webhook error:', e);
    }
    res.status(200).send();
});

// Auth routes (signup/login)
app.post('/api/auth/signup', async (req, res) => {
  const { email, password } = req.body;
  try {
    const existing = await findUserByEmail(email);
    if (existing) {
      return res.status(400).json({ error: 'User already exists' });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const userId = await createUser(email, passwordHash);
    res.status(201).json({ userId });
  } catch (err: any) {
    res.status(500).json({ error: 'Signup failed', details: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await findUserByEmail(email);
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '1h' });
    res.cookie('token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production' });
    res.json({ userId: user.id });
  } catch (err: any) {
    res.status(500).json({ error: 'Login failed', details: err.message });
  }
});

// ====================================================================
// HEALTH PROBE
// ====================================================================
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Global error handler (should be last)
app.use(errorHandler);

// Run startup
(async () => {
    await setupStaticRoutes();
    console.log(`[CLOUD_X_INIT] Attempting to listen on port ${PORT}...`);
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`Cloud X - Digital Vault running at http://localhost:${PORT}`);
    });
    initializeServices().catch(error => console.error('[CLOUD_X_INIT] Error in initial services:', error));
})();

async function setupStaticRoutes() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }
}

async function initializeServices() {
  console.log('[CLOUD_X_INIT] Initializing background services...');
  
  // Schedule Grace Period check every hour
  setInterval(checkGracePeriods, 60 * 60 * 1000);
  
  try {
     await initializeDatabase();
  } catch (err: any) {
    console.error('DATABASE CONNECTIVITY ERROR: Startup proceeding with degraded functionality.');
  }
}

import express from 'express';
import cors from 'cors';
import productsRouter from './routes/products.js';
import contactRouter from './routes/contact.js';
import checkoutRouter from './routes/checkout.js';
import newsletterRouter from './routes/newsletter.js';
import categoriesRouter from './routes/categories.js';
import authRouter from './routes/auth.js';
import companiesRouter from './routes/companies.js';
import sellerRouter from './routes/seller.js';
import sellersRouter from './routes/sellers.js';
import paymentsRouter from './routes/payments.js';
import adminProductsRouter from './routes/adminProducts.js';
import { connectRedis, redis, isRedisAvailable } from './lib/redis.js';
import { authenticate, requirePlatformAdmin } from './middleware/auth.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Derrière nginx : req.ip doit être l'adresse du client (limitation de débit des commandes invitées)
app.set('trust proxy', 1);

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Routes
app.use('/api/products', productsRouter);
app.use('/api/contact', contactRouter);
app.use('/api/checkout', checkoutRouter);
app.use('/api/newsletter', newsletterRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/auth', authRouter);
app.use('/api/companies', companiesRouter);
app.use('/api/seller', sellerRouter);
app.use('/api/sellers', sellersRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/admin/products', adminProductsRouter);

// Health check with Redis status
app.get('/api/health', async (_req, res) => {
  let redisStatus = 'not_configured';

  if (isRedisAvailable) {
    try {
      await redis.ping();
      redisStatus = 'connected';
    } catch (err) {
      redisStatus = 'error';
      console.error('Redis ping failed:', err);
    }
  }

  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    redis: redisStatus,
    env: {
      hasUpstashUrl: Boolean(process.env.UPSTASH_REDIS_REST_URL),
      hasUpstashToken: Boolean(process.env.UPSTASH_REDIS_REST_TOKEN),
    },
  });
});

// Cache stats endpoint
app.get('/api/cache/stats', async (_req, res) => {
  try {
    const info = await redis.info('stats');
    const dbSize = await redis.dbsize();
    res.json({
      keys: dbSize,
      info: info,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get cache stats' });
  }
});

// Clear cache endpoint (for admin use)
app.delete('/api/cache', authenticate, requirePlatformAdmin, async (_req, res) => {
  try {
    await redis.flushdb();
    res.json({ message: 'Cache cleared successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to clear cache' });
  }
});

// Start server
async function start() {
  // Connect to Redis
  await connectRedis();

  app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
  });
}

start().catch(console.error);

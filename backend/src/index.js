import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import seoRouter from './routes/seo.js';
import blogRouter from './routes/blog.js';
import authRouter from './routes/auth.js';
import authV2Router from './routes/authV2.js';
import chatRouter from './routes/chat.js';
import chatManageRouter from './routes/chatManage.js';
import permissionRouter from './routes/permission.js';
import statisticsRouter from './routes/statistics.js';
import stockRouter from './routes/stock.js';
import uploadRouter from './routes/upload.js';
import { connectMongoDB } from './db/mongoose.js';
import { backfillFileMd5sInBackground } from './services/fileStore.js';
import { initializeAgentCatalog } from './services/agentStore.js';
import { resolveUserFromRequest } from './middleware/auth.js';
import { initializeIdentityCatalog } from './services/identityStore.js';
import { initializeModelCatalog } from './services/modelStore.js';
import { initializePermissionSystem } from './services/permissionStore.js';
import { ensureStockReviewIndexes } from './services/stockStore.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.use(async (req, res, next) => {
  try {
    const user = await resolveUserFromRequest(req);
    if (user?.isBlacklisted) {
      return res.status(403).json({ error: user.blacklist?.reason || '当前账号已被加入黑名单' });
    }
    return next();
  } catch (error) {
    return res.status(error?.statusCode || 500).json({ error: error.message || '鉴权失败' });
  }
});

app.use('/api', authRouter);
app.use('/api', authV2Router);
app.use('/api', chatRouter);
app.use('/api', chatManageRouter);
app.use('/api/blog', blogRouter);
app.use('/api/stock', stockRouter);
app.use('/api', permissionRouter);
app.use('/api', statisticsRouter);
app.use('/api', uploadRouter);
app.use(seoRouter);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

async function startServer() {
  try {
    const mongoUri = await connectMongoDB();
    console.log(`MongoDB connected: ${mongoUri}`);
    await ensureStockReviewIndexes();
    console.log('Stock review indexes ready');
    const permissionResult = await initializePermissionSystem();
    console.log(`Permission system ready: ${permissionResult.groupCount} groups, ${permissionResult.blacklistCount} blacklist entries`);
    const modelResult = await initializeModelCatalog();
    console.log(`Chat model catalog ready: ${modelResult.totalCount} models`);
    const agentResult = await initializeAgentCatalog();
    console.log(`Agent catalog ready: ${agentResult.totalCount} agents`);
    const identityResult = await initializeIdentityCatalog();
    console.log(`Identity catalog ready: ${identityResult.totalCount} total, ${identityResult.createdCount} initialized from seed files`);
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
    void backfillFileMd5sInBackground();
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
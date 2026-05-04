import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import blogRouter from './routes/blog.js';
import authRouter from './routes/auth.js';
import chatRouter from './routes/chat.js';
import uploadRouter from './routes/upload.js';
import { connectMongoDB } from './db/mongoose.js';
import { initializeIdentityCatalog } from './services/identityStore.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.use('/api', authRouter);
app.use('/api', chatRouter);
app.use('/api/blog', blogRouter);
app.use('/api', uploadRouter);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

async function startServer() {
  try {
    const mongoUri = await connectMongoDB();
    console.log(`MongoDB connected: ${mongoUri}`);
    const identityResult = await initializeIdentityCatalog();
    console.log(`Identity catalog ready: ${identityResult.totalCount} total, ${identityResult.createdCount} initialized from seed files`);
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
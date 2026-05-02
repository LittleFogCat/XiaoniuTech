import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import chatRouter from './routes/chat.js';
import { connectMongoDB } from './db/mongoose.js';
import { initializeIdentityCatalog } from './services/identityStore.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api', chatRouter);

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
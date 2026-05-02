import 'dotenv/config';
import path from 'path';
import process from 'process';
import { fileURLToPath } from 'url';
import { connectMongoDB, disconnectMongoDB } from '../db/mongoose.js';
import Chat from '../models/Chat.js';

const __filename = fileURLToPath(import.meta.url);

function parseArgs(argv) {
  const args = {
    apply: false,
    userId: process.env.CHAT_ADMIN_USERNAME || null,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];
    if (current === '--apply') {
      args.apply = true;
      continue;
    }

    if (current === '--help' || current === '-h') {
      args.help = true;
      continue;
    }

    if (current === '--user' || current === '--userId') {
      args.userId = argv[index + 1] || args.userId;
      index += 1;
    }
  }

  return args;
}

function printHelp() {
  console.log('用法: node src/scripts/migrateLegacyChats.js [--user <userId>] [--apply]');
  console.log('');
  console.log('默认仅预览，不会写入数据库。');
  console.log('--apply        实际执行迁移');
  console.log('--user         指定要回填到哪个 userId（必须在执行迁移时指定，或设置 CHAT_ADMIN_USERNAME 环境变量）');
}

function buildLegacyFilter() {
  return {
    $or: [
      { userId: { $exists: false } },
      { userId: null },
      { userId: '' },
    ],
  };
}

export async function migrateLegacyChats(options = {}) {
  const userId = options.userId || process.env.CHAT_ADMIN_USERNAME || null;
  const apply = Boolean(options.apply);
  const filter = buildLegacyFilter();

  if (!userId) {
    if (apply) {
      throw new Error('要执行迁移，请使用 --user 指定目标 userId 或设置 CHAT_ADMIN_USERNAME 环境变量。');
    }
    console.log('预览模式：未指定目标 userId。使用 --user 指定或设置 CHAT_ADMIN_USERNAME 环境变量以执行迁移。');
  }

  const mongoUri = await connectMongoDB();
  try {
    const legacyCount = await Chat.countDocuments(filter);
    console.log(`MongoDB connected: ${mongoUri}`);
    console.log(`发现 ${legacyCount} 条缺少 userId 的历史聊天记录。`);

    if (!legacyCount) {
      return { matchedCount: 0, modifiedCount: 0, userId, dryRun: !apply };
    }

    if (!apply) {
      console.log(`预览模式：将会把这些聊天记录回填到 userId="${userId || '<未指定>'}"。`);
      console.log('如需实际执行，请追加 --apply 并指定 --user 或设置 CHAT_ADMIN_USERNAME 环境变量。');
      return { matchedCount: legacyCount, modifiedCount: 0, userId, dryRun: true };
    }

    const result = await Chat.updateMany(filter, {
      $set: { userId },
    });

    console.log(`迁移完成：matched=${result.matchedCount}, modified=${result.modifiedCount}, userId="${userId}"`);
    return {
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
      userId,
      dryRun: false,
    };
  } finally {
    await disconnectMongoDB();
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  await migrateLegacyChats({
    userId: args.userId,
    apply: args.apply,
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  main().catch(error => {
    console.error('迁移失败:', error);
    process.exit(1);
  });
}
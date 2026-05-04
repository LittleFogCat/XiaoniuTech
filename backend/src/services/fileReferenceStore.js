import FileReference from '../models/FileReference.js';

function normalizeFileIds(fileIds = []) {
  return [...new Set(fileIds.filter(Boolean).map(fileId => String(fileId)))];
}

export async function syncFileReferencesForBiz({ bizType, bizId, fileIds = [] }) {
  const normalizedBizId = String(bizId || '').trim();
  if (!bizType || !normalizedBizId) {
    return;
  }

  const normalizedFileIds = normalizeFileIds(fileIds);

  await FileReference.updateMany(
    { refRecord: { $elemMatch: { bizType, bizId: normalizedBizId } } },
    { $pull: { refRecord: { bizType, bizId: normalizedBizId } } }
  );

  await FileReference.deleteMany({ refRecord: { $size: 0 } });

  if (normalizedFileIds.length === 0) {
    return;
  }

  const now = new Date();
  for (const fileId of normalizedFileIds) {
    const reference = await FileReference.findOne({ fileId });
    if (!reference) {
      await FileReference.create({
        fileId,
        refRecord: [
          {
            bizType,
            bizId: normalizedBizId,
            createdAt: now,
            updatedAt: now,
          },
        ],
      });
      continue;
    }

    reference.refRecord.push({
      bizType,
      bizId: normalizedBizId,
      createdAt: now,
      updatedAt: now,
    });
    await reference.save();
  }
}

export async function clearFileReferencesForBiz({ bizType, bizId }) {
  const normalizedBizId = String(bizId || '').trim();
  if (!bizType || !normalizedBizId) {
    return;
  }

  await FileReference.updateMany(
    { refRecord: { $elemMatch: { bizType, bizId: normalizedBizId } } },
    { $pull: { refRecord: { bizType, bizId: normalizedBizId } } }
  );

  await FileReference.deleteMany({ refRecord: { $size: 0 } });
}
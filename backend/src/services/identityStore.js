import { loadSeedIdentities, toPublicIdentity } from '../config/identities.js';
import Identity from '../models/Identity.js';

function isDuplicateKeyError(error) {
  return Boolean(error && typeof error === 'object' && error.code === 11000);
}

function normalizeIdentityDoc(doc) {
  if (!doc) {
    return null;
  }

  return {
    id: doc._id.toString(),
    name: doc.name,
    role: doc.role || '',
    description: doc.description || '',
    avatarUrl: doc.avatarUrl || '',
    personaDefinition: doc.personaDefinition,
    source: doc.source || 'manual',
    seedFile: doc.seedFile || '',
    createdAt: doc.createdAt ? new Date(doc.createdAt).getTime() : null,
    updatedAt: doc.updatedAt ? new Date(doc.updatedAt).getTime() : null,
  };
}

export async function initializeIdentityCatalog() {
  const existingCount = await Identity.countDocuments();
  let seedIdentities = [];

  try {
    seedIdentities = loadSeedIdentities();
  } catch (error) {
    if (existingCount > 0) {
      console.warn(`[identity:init] Seed loading skipped: ${error.message}`);
      return { existingCount, createdCount: 0, totalCount: existingCount, skipped: true };
    }
    throw error;
  }

  if (!seedIdentities.length) {
    return { existingCount, createdCount: 0, totalCount: existingCount, skipped: true };
  }

  let createdCount = 0;

  for (const identity of seedIdentities) {
    try {
      const result = await Identity.updateOne(
        { _id: identity.id },
        {
          $setOnInsert: {
            _id: identity.id,
            name: identity.name,
            role: identity.role || '',
            description: identity.description,
            avatarUrl: identity.avatarUrl,
            personaDefinition: identity.personaDefinition,
            source: 'seed',
            seedFile: identity.seedFile || `${identity.id}.md`,
          },
        },
        { upsert: true }
      );

      createdCount += result.upsertedCount || 0;

      if (identity.role) {
        await Identity.updateOne(
          {
            _id: identity.id,
            source: 'seed',
            $or: [
              { role: { $exists: false } },
              { role: '' },
              { role: null },
            ],
          },
          {
            $set: {
              role: identity.role,
            },
          }
        );
      }

      if (identity.name && identity.name !== identity.id) {
        await Identity.updateOne(
          {
            _id: identity.id,
            source: 'seed',
            name: identity.id,
          },
          {
            $set: {
              name: identity.name,
            },
          }
        );
      }
    } catch (error) {
      if (existingCount > 0 && isDuplicateKeyError(error)) {
        console.warn(`[identity:init] Seed skipped for ${identity.id}: ${error.message}`);
        continue;
      }
      throw error;
    }
  }

  const totalCount = await Identity.countDocuments();
  return { existingCount, createdCount, totalCount, skipped: false };
}

export async function listPublicIdentities() {
  const docs = await Identity.find({}).sort({ name: 1 }).lean();
  return docs.map(toPublicIdentity);
}

export async function getIdentityById(id) {
  if (!id) {
    return null;
  }

  const doc = await Identity.findById(String(id)).lean();
  return normalizeIdentityDoc(doc);
}

export async function listIdentities() {
  const docs = await Identity.find({}).sort({ name: 1 }).lean();
  return docs.map(normalizeIdentityDoc);
}

export default {
  initializeIdentityCatalog,
  listPublicIdentities,
  getIdentityById,
  listIdentities,
};
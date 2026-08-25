import { MongoClient, Db, ObjectId, type Collection, type CreateIndexesOptions, type Document, type IndexSpecification } from 'mongodb';

const dbName = process.env.MONGODB_DB ?? 'telegraph_register_miner';

let client: MongoClient | undefined;
let clientPromise: Promise<MongoClient> | undefined;

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

function getClientPromise(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not configured on the server.');

  // In dev, stash the promise on globalThis so Next.js hot-reload doesn't open
  // a fresh connection on every edit.
  if (process.env.NODE_ENV === 'development') {
    if (!global._mongoClientPromise) {
      client = new MongoClient(uri);
      global._mongoClientPromise = client.connect();
    }
    return global._mongoClientPromise;
  }

  if (!clientPromise) {
    client = new MongoClient(uri);
    clientPromise = client.connect();
  }
  return clientPromise;
}

export async function getDb(): Promise<Db> {
  const c = await getClientPromise();
  return c.db(dbName);
}

export interface UserDoc {
  _id?: ObjectId;
  email: string;
  passwordHash: string;
  /** @deprecated legacy single-wallet field, kept for accounts linked before multi-wallet support. */
  walletAddress?: string | null;
  /** Lowercased addresses linked to this account. Any number may be linked; not mandatory. */
  walletAddresses?: string[];
  walletNonce: string | null;
  walletNonceIssuedAt: string | null;
  walletNonceExpiresAt: Date | null;
  /** ISO 3166-1 alpha-2 code, e.g. "US". Locked permanently once set. */
  country: string | null;
  firstName: string | null;
  lastName: string | null;
  discordUsername: string | null;
  xUsername: string | null;
  /** Once true, firstName/lastName/discordUsername/xUsername are permanent — set after the first save. */
  profileLocked: boolean;
  createdAt: Date;
  /** Consecutive wrong-password count since the last success or lockout. */
  failedLoginAttempts: number;
  /** Login is rejected outright while this is in the future. */
  loginLockedUntil: Date | null;
}

/**
 * createIndex, but if an index with the same auto-generated name already exists with
 * different options (code 85/86 — e.g. we changed an index's shape, like sparse -> partial,
 * across a deploy), drop the stale index and recreate it instead of failing forever.
 */
async function ensureIndex<T extends Document>(col: Collection<T>, spec: IndexSpecification, options: CreateIndexesOptions) {
  try {
    await col.createIndex(spec, options);
  } catch (err) {
    const code = (err as { code?: number }).code;
    if (code !== 85 && code !== 86) throw err;
    const existing = await col.indexes();
    const stale = existing.find(i => i.key && JSON.stringify(i.key) === JSON.stringify(spec));
    if (stale?.name) await col.dropIndex(stale.name).catch(() => {}); // already gone if another process won the race
    await col.createIndex(spec, options);
  }
}

let indexesEnsured = false;

export async function getUsersCollection() {
  const db = await getDb();
  const col = db.collection<UserDoc>('users');
  if (!indexesEnsured) {
    indexesEnsured = true;
    await Promise.all([
      ensureIndex(col, { email: 1 }, { unique: true }),
      ensureIndex(col, { walletAddress: 1 }, { unique: true, sparse: true }),
      // Partial (not sparse) index: a sparse index only excludes documents missing the
      // field entirely, but every user has walletAddresses present (defaults to []) — an
      // empty array still gets one index entry (as `undefined`) under a sparse index,
      // so every zero-wallet account would collide on that single slot. Filtering on
      // 'walletAddresses.0' existing (the only array-emptiness check partialFilterExpression
      // supports) correctly indexes only accounts with at least one linked wallet.
      ensureIndex(
        col,
        { walletAddresses: 1 },
        { unique: true, partialFilterExpression: { 'walletAddresses.0': { $exists: true } } },
      ),
    ]).catch(err => {
      indexesEnsured = false;
      throw err;
    });
  }
  return col;
}

export interface RateLimitDoc {
  _id?: ObjectId;
  key: string;
  count: number;
  expiresAt: Date;
}

let rateLimitIndexEnsured = false;

export async function getRateLimitsCollection() {
  const db = await getDb();
  const col = db.collection<RateLimitDoc>('rate_limits');
  if (!rateLimitIndexEnsured) {
    rateLimitIndexEnsured = true;
    await Promise.all([
      col.createIndex({ key: 1 }, { unique: true }),
      col.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    ]).catch(err => {
      rateLimitIndexEnsured = false;
      throw err;
    });
  }
  return col;
}

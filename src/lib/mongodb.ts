import { MongoClient, Db, ObjectId } from 'mongodb';

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
  /** Omitted entirely (not set to null) when unlinked — the unique index is sparse,
   *  which only excludes documents missing the field, not documents with value null.
   *  Wallets can no longer be unlinked once set — one wallet per account, permanently. */
  walletAddress?: string | null;
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

let indexesEnsured = false;

export async function getUsersCollection() {
  const db = await getDb();
  const col = db.collection<UserDoc>('users');
  if (!indexesEnsured) {
    indexesEnsured = true;
    await Promise.all([
      col.createIndex({ email: 1 }, { unique: true }),
      col.createIndex({ walletAddress: 1 }, { unique: true, sparse: true }),
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

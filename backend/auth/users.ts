import { randomBytes, randomUUID } from 'node:crypto';
import type Database from 'better-sqlite3';
import { hashPassword } from './password';

export const INITIAL_USERNAMES = ['qa1', 'qa2', 'qa3', 'qa4'] as const;
export async function prepareInitialUsers() {
  const accounts = [];
  for (const [index, username] of INITIAL_USERNAMES.entries()) {
    const password = randomBytes(24).toString('base64url');
    accounts.push({
      id: randomUUID(), username, displayName: 'QA User ' + (index + 1),
      password, passwordHash: await hashPassword(password),
    });
  }
  return accounts;
}
export function insertInitialUsers(db: Database.Database, accounts: Awaited<ReturnType<typeof prepareInitialUsers>>) {
  db.transaction(() => {
    if ((db.prepare('SELECT COUNT(*) AS count FROM users').get() as { count: number }).count !== 0) {
      throw new Error('Users already exist. Setup never overwrites existing accounts.');
    }
    const insert = db.prepare('INSERT INTO users (id, username, display_name, password_hash, created_at) VALUES (?, ?, ?, ?, ?)');
    for (const account of accounts) {
      insert.run(account.id, account.username, account.displayName, account.passwordHash, new Date().toISOString());
    }
  })();
}

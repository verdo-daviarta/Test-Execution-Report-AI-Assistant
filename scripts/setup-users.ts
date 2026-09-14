import fs from 'node:fs';
import path from 'node:path';
import { openDatabase } from '../backend/database';
import { insertInitialUsers, prepareInitialUsers } from '../backend/auth/users';

const db = openDatabase();
async function setup() {
  const count = (db.prepare('SELECT COUNT(*) AS count FROM users').get() as { count: number }).count;
  if (count > 0) {
    console.log('User setup skipped: accounts already exist. No passwords were changed.');
    return;
  }
  const destination = path.join(process.cwd(), 'data', 'initial-user-credentials.txt');
  if (fs.existsSync(destination)) throw new Error('Initial credentials file already exists. Setup refuses to overwrite it.');
  const accounts = await prepareInitialUsers();
  const content = [
    'PRIVATE - initial local account credentials',
    'All accounts have the same member permissions in the shared workspace.',
    'Move these credentials into a password manager and remove this file after distribution.',
    '',
    ...accounts.map(account => account.username + ': ' + account.password),
    '',
  ].join('\n');
  // Only this runtime-generated handoff file contains plaintext; the DB stores hashes.
  fs.writeFileSync(destination, content, { flag: 'wx', mode: 0o600 });
  insertInitialUsers(db, accounts);
  console.log('Created qa1, qa2, qa3, qa4. Passwords were not printed.');
  console.log('Private credential file: data/initial-user-credentials.txt (Git-ignored).');
}
setup().catch(() => {
  console.error('User setup failed. Check database access and whether the private credential file already exists. No existing account was overwritten.');
  process.exitCode = 1;
}).finally(() => db.close());

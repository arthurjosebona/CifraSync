/** Aplica as migrations no banco da DATABASE_URL (usado no workflow migrate e localmente). */
import { createDb, migrateDb } from './client.js';

const handle = await createDb();
await migrateDb(handle);
await handle.close();
console.log(`migrations aplicadas (${handle.kind})`);

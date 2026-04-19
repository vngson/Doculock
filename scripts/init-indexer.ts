import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env.local') });

import { createIndexes, listIndexes } from '../lib/mongodb-indexes';
import { syncEvents, getSyncStats } from '../services/indexer';
import { createSuiClient } from '../lib/doculock';

async function main() {
  try {
    await createIndexes();

    const suiClient = createSuiClient();
    await syncEvents(suiClient);

    const stats = await getSyncStats();
    console.log(`Synced ${stats.databaseCount}/${stats.blockchainCount} documents`);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();

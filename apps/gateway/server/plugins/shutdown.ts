import { definePlugin } from 'nitro';
import { db } from '../database/client.ts';

// Nitro's bun preset already stops accepting new connections and drains in-flight requests
// (including active SSE streams) on shutdown; this only needs to close the DB pool cleanly.
export default definePlugin((nitroApp) => {
  nitroApp.hooks.hook('close', async () => {
    await db.$client.close();
  });
});

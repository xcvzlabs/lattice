import { initLogger } from 'evlog';
import { definePlugin } from 'nitro';

// Wired manually rather than via evlog's `modules: [...]` Nitro integration. That path also
// prepends evlog's own error handler ahead of ours, and it serializes any JSON-ish request as
// its own generic error body, not just EvlogErrors. That would silently replace this gateway's
// OpenAI-compatible `{ error: { message, type, code } }` envelope for most clients.
// initLogger() only configures the logger; it doesn't touch nitro.config.ts's errorHandler.
export default definePlugin(() => {
  initLogger({
    env: {
      service: 'lattice-gateway',
    },
  });
});

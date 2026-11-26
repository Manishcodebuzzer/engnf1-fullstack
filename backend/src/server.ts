import { createApp } from './app.js';
import { config } from './config/env.js';

const app = createApp();

const server = app.listen(config.port, () => {
  console.log(`[TriageSync Backend] Server running on port ${config.port} in ${config.nodeEnv} mode`);
  console.log(`[TriageSync Backend] Health check: http://localhost:${config.port}/api/health`);
});

// Graceful shutdown handlers
const shutdown = (signal: string) => {
  console.log(`\n[TriageSync Backend] Received ${signal}. Closing server gracefully...`);
  server.close(() => {
    console.log('[TriageSync Backend] HTTP server closed.');
    process.exit(0);
  });
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

export default server;

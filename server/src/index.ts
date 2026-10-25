import './config/env.js';
import { isGeminiKeyConfigured, getGeminiModel } from './config/env.js';
import { app } from './app.js';
import { initializeStorage, getStorageStatus } from './services/store.js';

const PORT = parseInt(process.env.PORT || '5001', 10);

async function startServer() {
  await initializeStorage();

  const status = getStorageStatus();
  console.log('🩺 MedLens Server starting...');
  console.log(`📦 Storage status: ${status.message}`);
  const keyDetected = isGeminiKeyConfigured();
  console.log(
    `🤖 Gemini AI Agent: ${keyDetected ? `API Key Detected (Model: ${getGeminiModel()})` : 'Missing API Key (offline deterministic fallback active)'}`
  );

  app.listen(PORT, () => {
    console.log(`🚀 MedLens Backend running on http://localhost:${PORT}`);
    console.log(`📡 Health Check: http://localhost:${PORT}/api/status`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});

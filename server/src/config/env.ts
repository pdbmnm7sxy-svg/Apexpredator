import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Robust, path-independent environment configuration loader.
 * Discovers and loads server/.env and root .env regardless of whether the
 * server was started from the repository root, server directory, or npm workspace.
 */
export function loadServerEnv(): void {
  // Resolve paths relative to this file location (server/src/config/env.ts)
  const serverEnvPath = path.resolve(__dirname, '../../.env');
  const rootEnvPath = path.resolve(__dirname, '../../../.env');
  const cwdServerEnvPath = path.resolve(process.cwd(), 'server/.env');
  const cwdEnvPath = path.resolve(process.cwd(), '.env');

  // Load root .env first as base defaults if present
  if (fs.existsSync(rootEnvPath)) {
    dotenv.config({ path: rootEnvPath, override: false });
  } else if (fs.existsSync(cwdEnvPath)) {
    dotenv.config({ path: cwdEnvPath, override: false });
  }

  // Load server/.env with override to prioritize server-specific configuration
  if (fs.existsSync(serverEnvPath)) {
    dotenv.config({ path: serverEnvPath, override: true });
  } else if (fs.existsSync(cwdServerEnvPath)) {
    dotenv.config({ path: cwdServerEnvPath, override: true });
  }
}

// Auto-execute on module import so variables are available before client creation
loadServerEnv();

/**
 * Returns whether a Gemini API key is currently configured and non-empty.
 * Never returns or logs the raw secret string.
 */
export function isGeminiKeyConfigured(): boolean {
  loadServerEnv();
  const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!key) return false;
  const trimmed = key.trim();
  return trimmed.length > 0 && trimmed !== 'PASTE_KEY_HERE';
}

/**
 * Returns the configured Gemini model name.
 */
export function getGeminiModel(): string {
  loadServerEnv();
  return process.env.GEMINI_MODEL || 'gemini-3.5-flash';
}

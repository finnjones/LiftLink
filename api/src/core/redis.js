import { createClient } from 'redis';
import 'dotenv/config';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

// Parse for diagnostics (do NOT log credentials)
let parsed;
try {
  parsed = new URL(redisUrl);
  console.log(`Redis config -> protocol: ${parsed.protocol}, host: ${parsed.hostname}, port: ${parsed.port || '(default)'}`);
  if (parsed.protocol.startsWith('http')) {
    console.error('REDIS_URL appears to be an HTTP(S) REST URL. Use the Redis URL that starts with rediss:// from Upstash, not the REST URL.');
  }
} catch (e) {
  console.error('Invalid REDIS_URL. Please check your .env file.');
}

// Build client options
const clientOptions = { url: redisUrl };

// Add username/password explicitly if present (some clients require this even when provided in URL)
if (parsed) {
  if (parsed.username) clientOptions.username = parsed.username;
  if (parsed.password) clientOptions.password = parsed.password;
}

// Enable TLS for secure endpoints (Upstash uses rediss://)
if (redisUrl.startsWith('rediss://')) {
  clientOptions.socket = {
    tls: true,
    servername: parsed?.hostname, // Ensure SNI is set correctly for TLS
    rejectUnauthorized: false, // Upstash usually works with true, but false avoids local CA issues
  };
}

const redisClient = createClient(clientOptions);

redisClient.on('connect', () => {
  console.log('Connecting to Redis...');
});

redisClient.on('ready', () => {
  console.log('Connected to Redis successfully.');
});

redisClient.on('error', (err) => {
  console.error('Redis Client Error', err);
});

redisClient.on('end', () => {
  console.log('Disconnected from Redis.');
});

redisClient.connect().catch((err) => {
  console.error('Failed to connect to Redis:', err);
});

export default redisClient;


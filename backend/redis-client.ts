import { createClient } from 'redis';

const redisHost = process.env.REDIS_HOST || 'localhost';
const redisPort = process.env.REDIS_PORT || 6379;

// Create a Redis client
const redisClient = createClient({
  url: `redis://${redisHost}:${redisPort}`
});

// Handle connection errors
redisClient.on('error', (err) => console.log('Redis Client Error', err));

// Connect to Redis
async function connectRedis() {
  if (!redisClient.isOpen) {
    console.log('Connecting to Redis...');
    await redisClient.connect();
    console.log('Successfully connected to Redis.');
  }
}

// Ensure connection is established before exporting
connectRedis();

export default redisClient;

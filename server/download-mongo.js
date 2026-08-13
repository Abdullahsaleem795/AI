/**
 * This script is a utility for developers and CI environments where 
 * mongodb-memory-server downloads may timeout during Jest's execution window.
 * Run this script directly to securely download and cache the MongoDB binary
 * before running the test suite.
 */
import { MongoMemoryServer } from 'mongodb-memory-server';

(async () => {
  console.log('Starting MongoMemoryServer download/initialization...');
  try {
    const mongoServer = await MongoMemoryServer.create();
    console.log('Successfully started MongoMemoryServer at:', mongoServer.getUri());
    await mongoServer.stop();
    console.log('Stopped successfully. Binary should be cached.');
  } catch (err) {
    console.error('Error during MongoMemoryServer initialization:', err);
    process.exit(1);
  }
})();

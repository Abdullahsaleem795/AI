import { env } from './src/config/env.js';

const config = {
  mongodb: {
    url: env.MONGODB_URI,
    databaseName: env.MONGODB_URI.split('/').pop().split('?')[0] || "ai_khata_saas",
    options: {
      serverSelectionTimeoutMS: 5000,
    }
  },
  migrationsDir: "migrations",
  changelogCollectionName: "changelog",
  lockCollectionName: "changelog_lock",
  lockTtl: 0,
  migrationFileExtension: ".js",
  useFileHash: false,
  moduleSystem: 'esm',
};

export default config;

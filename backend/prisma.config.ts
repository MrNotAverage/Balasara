import { defineConfig } from 'prisma/config';
import path from 'path';

export default defineConfig({
  datasource: {
    provider: 'sqlite',
    url: process.env.DATABASE_URL || `file:${path.join(process.cwd(), 'dev.db')}`,
  },
});

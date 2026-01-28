import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Create the connection - strip Prisma-specific ?schema= parameter
const rawConnectionString = process.env.DATABASE_URL!;
const connectionString = rawConnectionString.replace(/[?&]schema=[^&]*/g, '').replace(/\?$/, '');

// For query purposes
const queryClient = postgres(connectionString);

// Create the drizzle instance with schema for relational queries
export const db = drizzle(queryClient, { schema });

// Export all schema types and tables
export * from './schema';

// Export the db instance as both db and prisma for easier migration
// (can remove prisma alias once migration is complete)
export { db as prisma };

// Re-export drizzle utilities that are commonly needed
export { eq, ne, gt, gte, lt, lte, and, or, not, inArray, notInArray, isNull, isNotNull, sql, desc, asc, count, sum, avg } from 'drizzle-orm';

import {DataSource} from 'typeorm';
import {config} from 'dotenv';

// Load environment variables
config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5433'),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'email_service',
  synchronize: process.env.NODE_ENV !== 'production', // Only sync in dev
  logging: process.env.NODE_ENV === 'development',
  entities: [__dirname + '/../entities/*.entity{.ts,.js}'],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  subscribers: [__dirname + '/subscribers/*{.ts,.js}'],
});

// Initialize database connection
export async function initializeDatabase(): Promise<DataSource> {
  try {
    const dataSource = await AppDataSource.initialize();
    console.log('✅ Database connection established');
    return dataSource;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    throw error;
  }
}

// Create database if not exists
export async function createDatabaseIfNotExists(): Promise<void> {
  const tempDataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5433'),
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: 'postgres', // Connect to default postgres db
  });

  try {
    await tempDataSource.initialize();

    const dbName = process.env.DB_NAME || 'email_service';

    // Check if database exists
    const result = await tempDataSource.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [dbName],
    );

    if (result.length === 0) {
      await tempDataSource.query(`CREATE DATABASE "${dbName}"`);
      console.log(`✅ Database "${dbName}" created`);
    } else {
      console.log(`✅ Database "${dbName}" already exists`);
    }
  } catch (error) {
    console.error('❌ Failed to create database:', error);
    throw error;
  } finally {
    await tempDataSource.destroy();
  }
}

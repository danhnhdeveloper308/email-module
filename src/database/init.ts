import {createDatabaseIfNotExists, initializeDatabase} from './data-source';
import {seedEmailTemplates} from './seeds/email-templates.seed';

async function initDatabase(): Promise<void> {
  console.log('🚀 Starting database initialization...');

  try {
    // Step 1: Create database if not exists
    console.log('📝 Step 1: Creating database if not exists...');
    await createDatabaseIfNotExists();

    // Step 2: Initialize connection and sync entities
    console.log('📝 Step 2: Initializing database connection...');
    const dataSource = await initializeDatabase();

    // Step 3: Run synchronization (create tables)
    console.log('📝 Step 3: Synchronizing database schema...');
    await dataSource.synchronize();
    console.log('✅ Database schema synchronized');

    // Step 4: Seed default data
    console.log('📝 Step 4: Seeding default templates...');
    await seedEmailTemplates(dataSource);

    console.log('🎉 Database initialization completed successfully!');

    // List all tables
    const tables = await dataSource.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);

    console.log(
      '📋 Created tables:',
      tables.map((t: any) => t.table_name),
    );

    await dataSource.destroy();
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  initDatabase();
}

export {initDatabase};

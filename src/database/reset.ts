import {AppDataSource, createDatabaseIfNotExists} from './data-source';

async function resetDatabase(): Promise<void> {
  console.log('🔄 Starting database reset...');

  try {
    const dataSource = await AppDataSource.initialize();

    // Drop all tables
    console.log('🗑️  Dropping all tables...');
    await dataSource.dropDatabase();
    console.log('✅ All tables dropped');

    // Recreate schema
    console.log('🏗️  Recreating database schema...');
    await dataSource.synchronize();
    console.log('✅ Database schema recreated');

    console.log('🎉 Database reset completed successfully!');

    await dataSource.destroy();
  } catch (error) {
    console.error('❌ Database reset failed:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  resetDatabase().catch(error => {
    console.error(error);
    process.exit(1);
  });
}

export {resetDatabase};

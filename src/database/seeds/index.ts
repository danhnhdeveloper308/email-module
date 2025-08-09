import {initializeDatabase} from '../data-source';
import {seedEmailTemplates} from './email-templates.seed';

async function runAllSeeds() {
  console.log('🌱 Starting database seeding...');

  try {
    const dataSource = await initializeDatabase();

    console.log('📧 Seeding email templates...');
    await seedEmailTemplates(dataSource);

    console.log('✅ All seeds completed successfully');
    await dataSource.destroy();
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  runAllSeeds();
}

export {runAllSeeds};

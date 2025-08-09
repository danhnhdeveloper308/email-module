import {AppDataSource} from './data-source';

async function checkDatabase(): Promise<void> {
  console.log('🔍 Checking database status...');

  try {
    const dataSource = await AppDataSource.initialize();

    // Check database connection
    console.log('✅ Database connection: OK');

    // List all tables
    const tables = await dataSource.query(`
      SELECT 
        table_name,
        table_type
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);

    console.log('📋 Database tables:');
    tables.forEach((table: any) => {
      console.log(`  - ${table.table_name} (${table.table_type})`);
    });

    // Check each entity table
    const entityTables = [
      'email_logs',
      'email_templates',
      'email_events',
      'email_stats',
      'oauth_credentials',
    ];

    console.log('\n📊 Table details:');
    for (const tableName of entityTables) {
      try {
        const count = await dataSource.query(
          `SELECT COUNT(*) as count FROM ${tableName}`,
        );
        console.log(`  - ${tableName}: ${count[0].count} records`);
      } catch (error) {
        console.log(`  - ${tableName}: ❌ Table not found`);
      }
    }

    // Check templates specifically - fix column name
    const templates = await dataSource.query(`
      SELECT name, category, "isActive" 
      FROM email_templates 
      ORDER BY name
    `);

    if (templates.length > 0) {
      console.log('\n📧 Email templates:');
      templates.forEach((template: any) => {
        const status = template.isActive ? '✅' : '❌';
        console.log(`  ${status} ${template.name} (${template.category})`);
      });
    } else {
      console.log('\n📧 No email templates found');
    }

    // Show database schema info
    console.log('\n🔧 Database schema info:');
    const schemaInfo = await dataSource.query(`
      SELECT 
        table_name,
        column_name,
        data_type,
        is_nullable
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name IN ('email_templates', 'email_logs', 'email_events', 'email_stats', 'oauth_credentials')
      ORDER BY table_name, ordinal_position
    `);

    const tableColumns: Record<string, any[]> = {};
    schemaInfo.forEach((col: any) => {
      if (!tableColumns[col.table_name]) {
        tableColumns[col.table_name] = [];
      }
      tableColumns[col.table_name].push(col);
    });

    Object.keys(tableColumns).forEach(tableName => {
      console.log(`\n  📋 ${tableName}:`);
      tableColumns[tableName].forEach((col: any) => {
        const nullable =
          col.is_nullable === 'YES' ? '(nullable)' : '(required)';
        console.log(`    - ${col.column_name}: ${col.data_type} ${nullable}`);
      });
    });

    await dataSource.destroy();
  } catch (error) {
    console.error('❌ Database check failed:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  checkDatabase().catch(error => {
    console.error(error);
    process.exit(1);
  });
}

export {checkDatabase};

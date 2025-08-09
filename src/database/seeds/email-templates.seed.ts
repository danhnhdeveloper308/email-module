import {DataSource} from 'typeorm';
import {EmailTemplate} from '../../entities/email-template.entity';
import * as fs from 'fs';
import * as path from 'path';

export async function seedEmailTemplates(
  dataSource: DataSource,
): Promise<void> {
  const templateRepository = dataSource.getRepository(EmailTemplate);

  // Update paths to match your structure
  const templatesDir = path.join(process.cwd(), 'templates', 'emails');
  const metadataPath = path.join(process.cwd(), 'templates', 'templates.json');

  console.log('Looking for templates in:', templatesDir);

  // Check if templates directory exists
  if (!fs.existsSync(templatesDir)) {
    console.warn('Templates directory not found:', templatesDir);
    console.log('Creating default templates in database...');
    await createDefaultTemplates(templateRepository);
    return;
  }

  // Load metadata
  let metadata: Record<string, any> = {};
  if (fs.existsSync(metadataPath)) {
    try {
      const metadataContent = fs.readFileSync(metadataPath, 'utf-8');
      metadata = JSON.parse(metadataContent);
      console.log('Loaded metadata for templates:', Object.keys(metadata));
    } catch (error) {
      console.warn('Failed to parse templates.json:', error.message);
    }
  } else {
    console.log('No templates.json found, using default metadata');
  }

  // Read all .hbs files recursively from templates/emails
  const templateFiles = getAllHbsFiles(templatesDir);

  console.log(`Found ${templateFiles.length} template files:`, templateFiles);

  if (templateFiles.length === 0) {
    console.log('No .hbs files found, creating default templates...');
    await createDefaultTemplates(templateRepository);
    return;
  }

  for (const filePath of templateFiles) {
    // Get relative path and template name
    const relativePath = path.relative(templatesDir, filePath);
    const templateName = path.basename(filePath, '.hbs');

    try {
      // Read template content
      const content = fs.readFileSync(filePath, 'utf-8');

      // Get metadata for this template
      const templateMeta = metadata[templateName] || {};

      // Check if template already exists
      const existingTemplate = await templateRepository.findOne({
        where: {name: templateName},
      });

      if (!existingTemplate) {
        const template = templateRepository.create({
          name: templateName,
          subject: templateMeta.subject || `${templateName} email`,
          description: templateMeta.description || `${templateName} template`,
          content: content,
          category: templateMeta.category || 'general',
          isActive: true,
        });

        await templateRepository.save(template);
        console.log(
          `✅ Created template: ${templateName} (from ${relativePath})`,
        );
      } else {
        // Update existing template content if different
        if (existingTemplate.content !== content) {
          existingTemplate.content = content;
          existingTemplate.subject =
            templateMeta.subject || existingTemplate.subject;
          existingTemplate.description =
            templateMeta.description || existingTemplate.description;
          existingTemplate.category =
            templateMeta.category || existingTemplate.category;
          existingTemplate.version = (existingTemplate.version || 0) + 1;

          await templateRepository.save(existingTemplate);
          console.log(
            `🔄 Updated template: ${templateName} (from ${relativePath})`,
          );
        } else {
          console.log(`⚡ Template unchanged: ${templateName}`);
        }
      }
    } catch (error) {
      console.error(
        `❌ Failed to process template ${templateName}:`,
        error.message,
      );
    }
  }
}

// Helper function to recursively find all .hbs files
function getAllHbsFiles(dir: string): string[] {
  let results: string[] = [];

  if (!fs.existsSync(dir)) {
    return results;
  }

  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      // Recursively search subdirectories
      results = results.concat(getAllHbsFiles(filePath));
    } else if (file.endsWith('.hbs')) {
      results.push(filePath);
    }
  }

  return results;
}

async function createDefaultTemplates(templateRepository: any): Promise<void> {
  const defaultTemplates = [
    {
      name: 'welcome',
      subject: 'Welcome to {{appName}}!',
      description: 'Welcome email for new users',
      content: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Welcome to {{appName}}</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="margin: 0; font-size: 28px;">Welcome to {{appName}}!</h1>
  </div>
  
  <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
    <h2 style="color: #667eea;">Hi {{name}}!</h2>
    
    <p>Thank you for joining <strong>{{appName}}</strong>. We're excited to have you on board!</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{loginUrl}}" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Get Started</a>
    </div>
  </div>
  
  <div style="text-align: center; margin-top: 20px; color: #666; font-size: 12px;">
    <p>© {{currentYear}} {{appName}}. All rights reserved.</p>
  </div>
</body>
</html>
      `,
      category: 'onboarding',
    },
    {
      name: 'verification',
      subject: 'Verify your email address',
      description: 'Email verification template',
      content: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Verify Your Email</title>
</head>
<body style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h1 style="color: #4CAF50;">Verify Your Email</h1>
  
  <p>Hi {{name}},</p>
  
  <p>Please verify your email address by clicking the button below:</p>
  
  <div style="text-align: center; margin: 30px 0;">
    <a href="{{verificationLink}}" style="background: #4CAF50; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Verify Email Address</a>
  </div>
  
  <p>Best regards,<br>{{appName}} Team</p>
</body>
</html>
      `,
      category: 'authentication',
    },
    {
      name: 'password-reset',
      subject: 'Reset your password',
      description: 'Password reset template',
      content: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Reset Your Password</title>
</head>
<body style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h1 style="color: #FF9800;">Reset Your Password</h1>
  
  <p>Hi {{name}},</p>
  
  <p>We received a request to reset your password for your {{appName}} account.</p>
  
  <div style="text-align: center; margin: 30px 0;">
    <a href="{{resetLink}}" style="background: #FF9800; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a>
  </div>
  
  <p>If you didn't request this, please ignore this email.</p>
  
  <p>Best regards,<br>{{appName}} Team</p>
</body>
</html>
      `,
      category: 'authentication',
    },
  ];

  for (const templateData of defaultTemplates) {
    const existingTemplate = await templateRepository.findOne({
      where: {name: templateData.name},
    });

    if (!existingTemplate) {
      const template = templateRepository.create({
        ...templateData,
        isActive: true,
      });
      await templateRepository.save(template);
      console.log(`✅ Created default template: ${templateData.name}`);
    }
  }
}

// Standalone execution
if (require.main === module) {
  const runSeed = async () => {
    const dataSource = new DataSource({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5433'),
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'email_service',
      entities: [__dirname + '/../../entities/*.entity{.ts,.js}'],
      synchronize: true,
      logging: false,
    });

    try {
      await dataSource.initialize();
      console.log('Database connection established');
      await seedEmailTemplates(dataSource);
      console.log('✅ Template seeding completed');
    } catch (error) {
      console.error('❌ Seeding failed:', error);
    } finally {
      await dataSource.destroy();
    }
  };

  runSeed();
}

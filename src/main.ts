import {NestFactory} from '@nestjs/core';
import {ValidationPipe, Logger} from '@nestjs/common';
import {DocumentBuilder, SwaggerModule} from '@nestjs/swagger';
import {Module} from '@nestjs/common';
import {ConfigModule} from '@nestjs/config';
import {TypeOrmModule} from '@nestjs/typeorm';
import {BullModule} from '@nestjs/bullmq';

// Import the EmailModule
import {EmailModule} from './email.module';

// Create a standalone app module for testing
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    // Add TypeORM configuration for standalone mode
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5433'),
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'email_service',
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: true, // This will create tables automatically
      logging: ['error', 'warn', 'migration'],
      autoLoadEntities: true,
      dropSchema: false, // Don't drop existing schema
    }),
    // Add BullMQ with updated configuration
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6380'),
      },
    }),
    // Import EmailModule with real SMTP configuration
    EmailModule.forRoot({
      defaults: {
        from: process.env.DEFAULT_FROM_EMAIL || 'hoangdanh54317@gmail.com',
        appName: process.env.APP_NAME || 'Email Module Test',
        appUrl: process.env.APP_URL || 'http://localhost:3000',
      },
      smtp: {
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        user: process.env.SMTP_USER || 'hoangdanh54317@gmail.com',
        pass: process.env.SMTP_PASS || 'etbzdyzfbjgyywps',
      },
    }),
  ],
})
class StandaloneEmailApp {}

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  try {
    // Create the standalone app
    const app = await NestFactory.create(StandaloneEmailApp);

    // Enable CORS for development
    app.enableCors();

    // Enable validation
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );

    // Setup Swagger
    const config = new DocumentBuilder()
      .setTitle('DN Secure Email Module')
      .setDescription(
        'Email service module with templates, tracking, and queue management',
      )
      .setVersion('1.0')
      .addTag('email', 'Email operations')
      .addTag('email-templates', 'Email template management')
      .addTag('email-dashboard', 'Email tracking and analytics')
      .addServer('http://localhost:3000', 'Development server')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, document);

    const port = process.env.PORT || 3000;
    await app.listen(port);

    logger.log(`🚀 Email Module running on: http://localhost:${port}`);
    logger.log(`📚 Swagger documentation: http://localhost:${port}/api`);
    logger.log(`🎯 Health check: http://localhost:${port}/email/health`);
    logger.log(`💡 To seed templates, run: npm run templates:sync`);
  } catch (error) {
    logger.error(`Failed to start application: ${error.message}`, error.stack);
    process.exit(1);
  }
}

bootstrap();

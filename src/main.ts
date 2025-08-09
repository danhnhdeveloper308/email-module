import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { EmailModule } from './index';
import { EmailConfigBuilder } from './interfaces/email-module-options.interface'; // ✅ Correct import path

// Standalone application module for testing
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    // Database configuration
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      autoLoadEntities: true,
      synchronize: process.env.NODE_ENV !== 'production',
      logging: ['error', 'warn'],
    }),

    // EmailModule with simplified configuration
    EmailModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        return EmailConfigBuilder.create()
          .smtp({
            host: configService.get('SMTP_HOST', 'smtp.gmail.com'),
            port: parseInt(configService.get('SMTP_PORT', '587')),
            secure: configService.get('SMTP_SECURE') === 'true',
            user: configService.get('SMTP_USER', ''),
            pass: configService.get('SMTP_PASS', ''),
          })
          .upstash(
            configService.get('REDIS_URL') ||
              configService.get('UPSTASH_REDIS_URL', ''),
          )
          .defaults(
            configService.get('DEFAULT_FROM_EMAIL', 'noreply@example.com'),
            configService.get('APP_NAME', 'DNSecure Email Module'),
            configService.get('APP_URL', 'http://localhost:3000'),
          )
          .withApi() // Include REST API controllers
          .build();
      },
      inject: [ConfigService],
    }),
  ],
})
class StandaloneEmailApp {}

async function bootstrap() {
  const logger = new Logger('EmailModule');

  try {
    const app = await NestFactory.create(StandaloneEmailApp);

    // Enable CORS
    app.enableCors();

    // Global validation pipe
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );

    // Swagger API documentation
    const config = new DocumentBuilder()
      .setTitle('DNSecure Email Module')
      .setDescription(
        'Professional email service with templates, tracking & queue management',
      )
      .setVersion('1.1.0')
      .addTag('email', 'Email operations')
      .addTag('templates', 'Template management')
      .addTag('dashboard', 'Analytics & tracking')
      .addServer('http://localhost:3000', 'Development server')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, document, {
      customSiteTitle: 'DNSecure Email API',
      customfavIcon: '/favicon.ico',
      customJs: [
        'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-bundle.min.js',
      ],
    });

    const port = process.env.PORT || 3000;
    await app.listen(port);

    logger.log(`🚀 DNSecure Email Module running on: http://localhost:${port}`);
    logger.log(`📚 API Documentation: http://localhost:${port}/api`);
    logger.log(`💚 Health Check: http://localhost:${port}/email/health`);
    logger.log(
      `📧 Send Test Email: POST http://localhost:${port}/email/test`,
    );
  } catch (error) {
    logger.error(`❌ Failed to start application: ${error.message}`);
    process.exit(1);
  }
}

// Run standalone app
if (require.main === module) {
  bootstrap();
}

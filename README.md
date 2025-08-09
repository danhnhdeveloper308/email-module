# DNSecure Email Module

A comprehensive NestJS email service module with advanced features including templates, tracking, queue management, and OAuth2 integration.

## Features

- 🚀 **Queue-based Email Processing** - Built with BullMQ for reliable email delivery
- 📧 **Template System** - Handlebars-powered email templates with partials support
- 📊 **Email Tracking** - Open and click tracking with detailed analytics
- 🔐 **OAuth2 Integration** - Secure Gmail integration with OAuth2
- 📈 **Analytics Dashboard** - Comprehensive email performance metrics
- 🔄 **Retry Logic** - Intelligent retry mechanisms for failed emails
- 🎨 **Responsive Templates** - Mobile-friendly email templates
- 🔍 **Email Logging** - Detailed logging and audit trail
- 📁 **Bulk Email Support** - Efficient bulk email processing
- 🛡️ **Security Features** - Spam detection and bounce handling

## Installation

```bash
npm install @dnsecure/email-module
```

## Quick Start

### 1. Install Dependencies

```bash
npm install @dnsecure/email-module @nestjs/typeorm @nestjs/bullmq @nestjs/config typeorm bullmq ioredis
```

### 2. Import Module

```typescript
import {Module} from '@nestjs/common';
import {EmailModule} from '@dnsecure/email-module';

@Module({
  imports: [
    EmailModule.forRoot({
      defaults: {
        from: 'noreply@example.com',
        appName: 'My App',
        appUrl: 'https://myapp.com',
      },
      smtp: {
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        user: 'your-email@gmail.com',
        pass: 'your-app-password',
      },
    }),
  ],
})
export class AppModule {}
```

### 3. Use Email Service

```typescript
import {Injectable} from '@nestjs/common';
import {EmailService} from '@dnsecure/email-module';

@Injectable()
export class UserService {
  constructor(private emailService: EmailService) {}

  async createUser(userData: any) {
    // Create user logic...

    // Send welcome email
    await this.emailService.sendWelcomeEmail(userData.email, userData.name);
  }

  async sendCustomEmail() {
    const emailId = await this.emailService.queueEmail(
      'user@example.com',
      'Custom Subject',
      'welcome', // template name
      {
        name: 'John Doe',
        customData: 'Hello World',
      },
    );

    console.log('Email queued with ID:', emailId);
  }
}
```

## Development Setup

### 1. Clone and Install

```bash
git clone <repository-url>
cd email-service
npm install
```

### 2. Environment Setup

```bash
cp .env.example .env
# Edit .env with your configuration
```

### 3. Start Development Stack

```bash
# Start Redis, PostgreSQL, and Mailhog
npm run docker:up

# Start the development server
npm run start:dev
```

### 4. Access Services

- **API Documentation**: http://localhost:3000/api
- **Mailhog (Email Testing)**: http://localhost:8025
- **Health Check**: http://localhost:3000/email/health

## API Endpoints

### Email Operations

- `POST /email/send` - Send email
- `POST /email/test` - Send test email
- `GET /email/status/:emailId` - Get email status
- `GET /email/health` - Health check
- `GET /email/queue/status` - Queue status

### Template Management

- `GET /email-templates` - List all templates
- `POST /email-templates` - Create template
- `PUT /email-templates/:id` - Update template
- `DELETE /email-templates/:id` - Delete template
- `POST /email-templates/preview` - Preview template

### Analytics

- `GET /email-dashboard/stats` - Get email statistics

## Configuration Options

### Basic Configuration

```typescript
EmailModule.forRoot({
  defaults: {
    from: 'noreply@example.com',
    appName: 'My Application',
    appUrl: 'https://myapp.com',
  },
  smtp: {
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    user: 'your-email@gmail.com',
    pass: 'your-password',
  },
});
```

### Async Configuration

```typescript
EmailModule.forRootAsync({
  imports: [ConfigModule],
  useFactory: (configService: ConfigService) => ({
    defaults: {
      from: configService.get('DEFAULT_FROM_EMAIL'),
      appName: configService.get('APP_NAME'),
      appUrl: configService.get('APP_URL'),
    },
    smtp: {
      host: configService.get('SMTP_HOST'),
      port: configService.get('SMTP_PORT'),
      user: configService.get('SMTP_USER'),
      pass: configService.get('SMTP_PASS'),
    },
  }),
  inject: [ConfigService],
});
```

### OAuth2 Configuration (Gmail)

```typescript
EmailModule.forRoot({
  oauth2: {
    clientId: 'your-client-id',
    clientSecret: 'your-client-secret',
    refreshToken: 'your-refresh-token',
  },
  smtp: {
    host: 'smtp.gmail.com',
    port: 587,
    user: 'your-email@gmail.com',
  },
});
```

## Email Templates

### Creating Templates

```typescript
const template = await emailService.saveTemplate(
  'welcome',
  `
  <h1>Welcome {{name}}!</h1>
  <p>Thank you for joining {{appName}}.</p>
  <a href="{{loginUrl}}">Get Started</a>
  `,
  {
    subject: 'Welcome to {{appName}}',
    description: 'Welcome email for new users',
    category: 'onboarding',
  },
);
```

### Using Templates

```typescript
await emailService.queueEmail('user@example.com', 'Welcome!', 'welcome', {
  name: 'John Doe',
  appName: 'My App',
  loginUrl: 'https://myapp.com/login',
});
```

### Built-in Templates

The module includes several built-in templates:

- `welcome` - Welcome new users
- `verification` - Email verification
- `password-reset` - Password reset
- `login-notification` - Login alerts
- `2fa-backup-codes` - 2FA backup codes

## Testing

### Unit Tests

```bash
npm test
```

### E2E Tests

```bash
npm run test:e2e
```

### Manual Testing

1. Start development server: `npm run start:dev`
2. Visit Swagger UI: http://localhost:3000/api
3. Test email endpoints
4. Check emails in Mailhog: http://localhost:8025

## Building for Production

### Build Library

```bash
npm run build:lib
```

### Publish to NPM

```bash
npm publish
```

## Architecture

```
src/
├── controllers/          # REST API controllers
├── services/            # Business logic services
├── entities/            # TypeORM entities
├── dto/                 # Data transfer objects
├── interfaces/          # TypeScript interfaces
├── processors/          # BullMQ job processors
├── decorators/          # Custom decorators
└── constants/           # Application constants
```

## Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/new-feature`
3. Commit changes: `git commit -am 'Add new feature'`
4. Push to branch: `git push origin feature/new-feature`
5. Submit pull request

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Support

- 📧 Email: support@dnsecure.com
- 🐛 Issues: [GitHub Issues](https://github.com/dnsecure/email-module/issues)
- 📖 Docs: [Documentation](https://docs.dnsecure.com/email-module)

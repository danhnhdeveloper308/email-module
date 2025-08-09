# DN Secure Email Module - Hướng Dẫn Sử Dụng Chi Tiết

## Mục lục

- [1. Cài Đặt](#1-cài-đặt)
- [2. Cấu Hình Cơ Bản](#2-cấu-hình-cơ-bản)
- [3. Tích Hợp Vào Dự Án](#3-tích-hợp-vào-dự-án)
- [4. Sử Dụng Email Service](#4-sử-dụng-email-service)
- [5. Quản Lý Templates](#5-quản-lý-templates)
- [6. Tracking và Analytics](#6-tracking-và-analytics)
- [7. Queue Management](#7-queue-management)
- [8. OAuth2 Setup](#8-oauth2-setup)
- [9. API Reference](#9-api-reference)
- [10. Troubleshooting](#10-troubleshooting)

---

## 1. Cài Đặt

### 1.1 Cài đặt từ NPM

```bash
npm install @dnsecure/email-module
```

### 1.2 Cài đặt dependencies bắt buộc

```bash
npm install @nestjs/typeorm @nestjs/bullmq @nestjs/config
npm install typeorm bullmq ioredis pg
npm install class-transformer class-validator
npm install handlebars nodemailer
```

### 1.3 Cài đặt development dependencies

```bash
npm install --save-dev @types/nodemailer @types/handlebars
```

---

## 2. Cấu Hình Cơ Bản

### 2.1 Environment Variables (.env)

```env
# Application
APP_NAME=My Application
APP_URL=https://myapp.com
DEFAULT_FROM_EMAIL=noreply@myapp.com

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/mydb

# Redis (for Queue)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# OAuth2 (Optional)
GMAIL_CLIENT_ID=your-client-id
GMAIL_CLIENT_SECRET=your-client-secret
GMAIL_REFRESH_TOKEN=your-refresh-token
```

### 2.2 TypeORM Configuration

```typescript
// app.module.ts
import {TypeOrmModule} from '@nestjs/typeorm';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      autoLoadEntities: true,
      synchronize: process.env.NODE_ENV !== 'production',
    }),
    // ... other imports
  ],
})
export class AppModule {}
```

---

## 3. Tích Hợp Vào Dự Án

### 3.1 Import Module với cấu hình cơ bản

```typescript
// app.module.ts
import {Module} from '@nestjs/common';
import {ConfigModule, ConfigService} from '@nestjs/config';
import {EmailModule} from '@dnsecure/email-module';

@Module({
  imports: [
    ConfigModule.forRoot({isGlobal: true}),

    // Cấu hình đồng bộ
    EmailModule.forRoot({
      defaults: {
        from: 'noreply@myapp.com',
        appName: 'My Application',
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

### 3.2 Import Module với cấu hình async

```typescript
// app.module.ts
@Module({
  imports: [
    ConfigModule.forRoot({isGlobal: true}),

    // Cấu hình async
    EmailModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        defaults: {
          from: configService.get('DEFAULT_FROM_EMAIL'),
          appName: configService.get('APP_NAME'),
          appUrl: configService.get('APP_URL'),
        },
        smtp: {
          host: configService.get('SMTP_HOST'),
          port: parseInt(configService.get('SMTP_PORT')),
          secure: configService.get('SMTP_SECURE') === 'true',
          user: configService.get('SMTP_USER'),
          pass: configService.get('SMTP_PASS'),
        },
        oauth2: {
          clientId: configService.get('GMAIL_CLIENT_ID'),
          clientSecret: configService.get('GMAIL_CLIENT_SECRET'),
          refreshToken: configService.get('GMAIL_REFRESH_TOKEN'),
        },
      }),
      inject: [ConfigService],
    }),
  ],
})
export class AppModule {}
```

---

## 4. Sử Dụng Email Service

### 4.1 Inject Service vào Controller/Service

```typescript
import {Injectable} from '@nestjs/common';
import {EmailService} from '@dnsecure/email-module';

@Injectable()
export class AuthService {
  constructor(private emailService: EmailService) {}

  // ... methods
}
```

### 4.2 Gửi Email Cơ Bản

```typescript
// Gửi email welcome
async registerUser(userData: any) {
  const user = await this.createUser(userData);

  const emailId = await this.emailService.sendWelcomeEmail(
    user.email,
    user.name
  );

  console.log('Welcome email sent:', emailId);
}
```

### 4.3 Gửi Email với Template Tùy Chỉnh

```typescript
// Gửi email với template và context
async sendCustomEmail() {
  const emailId = await this.emailService.queueEmail(
    'user@example.com',           // Recipient
    'Order Confirmation',         // Subject
    'order-confirmation',         // Template name
    {                            // Context data
      customerName: 'John Doe',
      orderNumber: 'ORD-12345',
      orderTotal: '$99.99',
      orderItems: [
        { name: 'Product 1', price: '$49.99' },
        { name: 'Product 2', price: '$49.99' },
      ],
    },
    {                           // Options
      tags: ['order', 'transactional'],
      priority: 'high',
      trackOpens: true,
      trackClicks: true,
    }
  );

  return emailId;
}
```

### 4.4 Gửi Email Bulk

```typescript
// Gửi email hàng loạt
async sendNewsletterCampaign() {
  const recipients = [
    {
      email: 'user1@example.com',
      name: 'John Doe',
      context: { subscribedDate: '2024-01-15' }
    },
    {
      email: 'user2@example.com',
      name: 'Jane Smith',
      context: { subscribedDate: '2024-02-20' }
    }
  ];

  const result = await this.emailService.sendBulkEmails(
    recipients,
    'Monthly Newsletter - {{month}}',
    'newsletter',
    {
      month: 'January 2024',
      companyNews: 'Big updates this month!',
    },
    {
      campaignId: 'newsletter-jan-2024',
      tags: ['newsletter', 'marketing'],
      priority: 'normal',
    }
  );

  console.log(`Bulk email campaign created: ${result.batchId}`);
  console.log(`${result.queued} emails queued successfully`);

  return result;
}
```

### 4.5 Các Loại Email Built-in

```typescript
// Email xác thực
await this.emailService.sendVerificationEmail(
  'user@example.com',
  'John Doe',
  'verification-token-123',
);

// Email reset password
await this.emailService.sendPasswordResetEmail(
  'user@example.com',
  'John Doe',
  'reset-token-456',
);

// Email thông báo đăng nhập
await this.emailService.sendLoginNotification('user@example.com', 'John Doe', {
  ipAddress: '192.168.1.1',
  userAgent: 'Chrome 120.0',
  location: 'Vietnam',
  time: new Date(),
  isNewDevice: true,
});

// Email 2FA backup codes
await this.emailService.sendTwoFactorBackupCodesEmail(
  'user@example.com',
  'John Doe',
  ['ABC123', 'DEF456', 'GHI789'],
);
```

---

## 5. Quản Lý Templates

### 5.1 Tạo Template qua Code

```typescript
// Tạo template mới
const template = await this.emailService.saveTemplate(
  'order-confirmation',
  `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Order Confirmation</title>
</head>
<body style="font-family: Arial, sans-serif;">
    <div style="max-width: 600px; margin: 0 auto;">
        <h1>Thank you for your order, {{customerName}}!</h1>
        
        <p>Your order <strong>{{orderNumber}}</strong> has been confirmed.</p>
        
        <h2>Order Summary:</h2>
        <table style="width: 100%; border-collapse: collapse;">
            {{#each orderItems}}
            <tr>
                <td style="border: 1px solid #ddd; padding: 8px;">{{name}}</td>
                <td style="border: 1px solid #ddd; padding: 8px;">{{price}}</td>
            </tr>
            {{/each}}
        </table>
        
        <p><strong>Total: {{orderTotal}}</strong></p>
        
        <p>We'll send you tracking information once your order ships.</p>
        
        <p>Best regards,<br>{{appName}} Team</p>
    </div>
</body>
</html>
  `,
  {
    subject: 'Order Confirmation - {{orderNumber}}',
    description: 'Email confirmation for completed orders',
    category: 'transactional',
    isActive: true,
  },
);
```

### 5.2 Templates từ File System

```typescript
// Tạo thư mục templates/emails/
// templates/emails/order-confirmation.hbs
```

```handlebars
<!-- templates/emails/order-confirmation.hbs -->

<html>
  <head>
    <meta charset='utf-8' />
    <title>Order Confirmation</title>
  </head>
  <body style='font-family: Arial, sans-serif;'>
    <h1>Hi {{customerName}}!</h1>

    <p>Your order
      {{orderNumber}}
      totaling
      {{orderTotal}}
      has been confirmed.</p>

    <h2>Items Ordered:</h2>
    <ul>
      {{#each orderItems}}
        <li>{{name}} - {{price}}</li>
      {{/each}}
    </ul>

    <p>Thank you for your business!</p>
  </body>
</html>
```

```json
// templates/templates.json
{
  "order-confirmation": {
    "subject": "Order Confirmation - {{orderNumber}}",
    "description": "Email sent when order is confirmed",
    "category": "transactional"
  }
}
```

```bash
# Sync templates từ file vào database
npm run templates:sync
```

### 5.3 Handlebars Helpers

Module có sẵn các helpers:

```handlebars
<!-- Current year -->
<p>&copy; {{currentYear}} {{appName}}</p>

<!-- Format date -->
<p>Order Date: {{formatDate orderDate 'short'}}</p>
<p>Full Date: {{formatDate orderDate 'long'}}</p>

<!-- Conditional rendering -->
{{#ifCond orderTotal '>' '100'}}
  <p>Free shipping applies!</p>
{{else}}
  <p>Shipping: $9.99</p>
{{/ifCond}}

<!-- Loop with index -->
{{#each items}}
  <p>{{@index}}: {{name}}</p>
{{/each}}
```

---

## 6. Tracking và Analytics

### 6.1 Email Tracking

```typescript
// Kiểm tra trạng thái email
const status = await this.emailService.getEmailStatus('email-id');
console.log(status);
// Output:
// {
//   id: 'email-id',
//   status: 'opened',
//   to: 'user@example.com',
//   subject: 'Welcome Email',
//   sentAt: '2024-01-15T10:30:00Z',
//   openedAt: '2024-01-15T10:35:00Z',
//   clickedAt: null
// }
```

### 6.2 Tracking Links trong Template

```handlebars
<!-- Tracking pixel (tự động thêm) -->
<img src='{{trackingPixelUrl}}' width='1' height='1' />

<!-- Tracked links -->
<a href='{{trackUrl "https://myapp.com/dashboard"}}'>
  Visit Dashboard
</a>

<a href='{{trackUrl "https://myapp.com/products"}}'>
  View Products
</a>
```

### 6.3 Analytics Dashboard

```bash
# Truy cập dashboard
curl "http://localhost:3000/email-dashboard/stats?startDate=2024-01-01&endDate=2024-01-31"
```

```json
{
  "success": true,
  "stats": [
    {
      "date": "2024-01-15",
      "sent": 150,
      "delivered": 147,
      "opened": 89,
      "clicked": 23,
      "bounced": 2,
      "failed": 1
    }
  ],
  "period": {
    "start": "2024-01-01T00:00:00Z",
    "end": "2024-01-31T23:59:59Z"
  }
}
```

### 6.4 Performance Metrics

```bash
# Get performance metrics
curl "http://localhost:3000/email-dashboard/metrics?period=30d"
```

```json
{
  "success": true,
  "metrics": {
    "deliveryRate": "98.20",
    "openRate": "60.54",
    "clickRate": "25.84",
    "clickToOpenRate": "25.84",
    "totalSent": 1500,
    "totalDelivered": 1473,
    "totalOpened": 892,
    "totalClicked": 230
  }
}
```

---

## 7. Queue Management

### 7.1 Kiểm Tra Queue Status

```typescript
// Trong controller hoặc service
async getQueueInfo() {
  const queueStats = await this.emailQueue.getWaiting();
  const activeJobs = await this.emailQueue.getActive();
  const failedJobs = await this.emailQueue.getFailed();

  return {
    waiting: queueStats.length,
    active: activeJobs.length,
    failed: failedJobs.length,
  };
}
```

### 7.2 Retry Failed Emails

```typescript
// Retry một email failed
async retryEmail(emailId: string) {
  const newEmailId = await this.emailService.resendEmail(emailId);
  return newEmailId;
}

// Retry tất cả failed emails
async retryAllFailed() {
  const failedJobs = await this.emailQueue.getFailed();

  for (const job of failedJobs) {
    await job.retry();
  }

  return `Retried ${failedJobs.length} failed emails`;
}
```

### 7.3 Scheduled Emails

```typescript
// Gửi email định thời
const futureDate = new Date();
futureDate.setHours(futureDate.getHours() + 24); // 24 giờ sau

await this.emailService.queueEmail(
  'user@example.com',
  'Reminder Email',
  'reminder',
  {name: 'John'},
  {
    deliveryTime: futureDate,
    tags: ['scheduled', 'reminder'],
  },
);
```

---

## 8. OAuth2 Setup

### 8.1 Setup Gmail OAuth2

```bash
# 1. Tạo Google Cloud Project
# 2. Enable Gmail API
# 3. Tạo OAuth2 credentials
# 4. Get authorization URL

curl "http://localhost:3000/oauth2/gmail/auth-url"
```

```json
{
  "success": true,
  "authUrl": "https://accounts.google.com/o/oauth2/v2/auth?client_id=...",
  "instructions": [
    "1. Visit the authorization URL",
    "2. Grant permissions",
    "3. Copy the authorization code",
    "4. Use POST /oauth2/gmail/token"
  ]
}
```

### 8.2 Exchange Code for Tokens

```bash
# Exchange authorization code
curl -X POST "http://localhost:3000/oauth2/gmail/token" \
  -H "Content-Type: application/json" \
  -d '{"code": "authorization-code-from-google"}'
```

### 8.3 Test OAuth2 Connection

```bash
curl "http://localhost:3000/oauth2/gmail/test"
```

---

## 9. API Reference

### 9.1 Email Endpoints

| Method | Endpoint                 | Description          |
| ------ | ------------------------ | -------------------- |
| POST   | `/email/send`            | Gửi email đơn lẻ     |
| POST   | `/email/bulk`            | Gửi email hàng loạt  |
| POST   | `/email/test`            | Gửi test email       |
| GET    | `/email/status/:emailId` | Lấy trạng thái email |
| POST   | `/email/retry/:emailId`  | Retry email failed   |
| GET    | `/email/queue/status`    | Trạng thái queue     |
| GET    | `/email/queue/details`   | Chi tiết queue       |
| GET    | `/email/health`          | Health check         |

### 9.2 Template Endpoints

| Method | Endpoint                   | Description           |
| ------ | -------------------------- | --------------------- |
| GET    | `/email-templates`         | Danh sách templates   |
| GET    | `/email-templates/:name`   | Lấy template theo tên |
| POST   | `/email-templates`         | Tạo template mới      |
| PUT    | `/email-templates/:id`     | Cập nhật template     |
| DELETE | `/email-templates/:id`     | Xóa template          |
| POST   | `/email-templates/preview` | Preview template      |

### 9.3 Dashboard Endpoints

| Method | Endpoint                                 | Description          |
| ------ | ---------------------------------------- | -------------------- |
| GET    | `/email-dashboard/stats`                 | Thống kê email       |
| POST   | `/email-dashboard/stats/generate`        | Tạo thống kê         |
| GET    | `/email-dashboard/metrics`               | Performance metrics  |
| GET    | `/email-dashboard/templates/performance` | Template performance |

### 9.4 OAuth2 Endpoints

| Method | Endpoint                 | Description              |
| ------ | ------------------------ | ------------------------ |
| GET    | `/oauth2/gmail/auth-url` | Lấy URL authorization    |
| POST   | `/oauth2/gmail/token`    | Exchange code cho tokens |
| GET    | `/oauth2/gmail/test`     | Test OAuth2 connection   |

---

## 10. Troubleshooting

### 10.1 Common Issues

#### Issue: "Template not found"

```bash
# Kiểm tra templates có sẵn
curl "http://localhost:3000/email-templates"

# Sync templates từ file
npm run templates:sync
```

#### Issue: "SMTP connection failed"

```bash
# Kiểm tra cấu hình SMTP
curl "http://localhost:3000/email/health"

# Test với Mailhog (development)
docker run -p 1025:1025 -p 8025:8025 mailhog/mailhog
```

#### Issue: "Queue not processing"

```bash
# Kiểm tra Redis connection
redis-cli ping

# Restart Redis
docker restart redis-container

# Check queue status
curl "http://localhost:3000/email/queue/details"
```

### 10.2 Debugging

```typescript
// Enable debug logging
import {Logger} from '@nestjs/common';

@Injectable()
export class MyService {
  private logger = new Logger(MyService.name);

  async sendEmail() {
    this.logger.debug('Sending email...');
    // ... email logic
    this.logger.log('Email sent successfully');
  }
}
```

### 10.3 Performance Tips

1. **Use Redis for caching:**

```typescript
// Cache compiled templates
private templateCache = new Map<string, HandlebarsTemplate>();
```

2. **Batch processing:**

```typescript
// Process emails in batches
const batchSize = 100;
for (let i = 0; i < recipients.length; i += batchSize) {
  const batch = recipients.slice(i, i + batchSize);
  await this.processBatch(batch);
}
```

3. **Monitor queue health:**

```bash
# Regular queue monitoring
watch -n 5 "curl -s http://localhost:3000/email/queue/details"
```

### 10.4 Production Checklist

- [ ] Cấu hình SMTP production
- [ ] Setup OAuth2 cho Gmail
- [ ] Configure Redis persistence
- [ ] Setup monitoring và alerts
- [ ] Configure proper logging
- [ ] Setup database backups
- [ ] Test email deliverability
- [ ] Configure rate limiting
- [ ] Setup SSL/TLS
- [ ] Configure environment variables

---

## Kết Luận

Email Module cung cấp giải pháp hoàn chỉnh cho việc gửi email trong ứng dụng NestJS. Với tài liệu này, bạn có thể:

1. ✅ Tích hợp module vào dự án
2. ✅ Cấu hình SMTP và OAuth2
3. ✅ Tạo và quản lý templates
4. ✅ Gửi email đơn lẻ và bulk
5. ✅ Theo dõi performance
6. ✅ Troubleshoot các vấn đề

Để được hỗ trợ thêm, vui lòng tham khảo:

- 📖 [API Documentation](http://localhost:3000/api)
- 🔧 [Architecture Guide](./ARCHITECTURE.md)
- 🐛 [GitHub Issues](https://github.com/dnsecure/email-module/issues)

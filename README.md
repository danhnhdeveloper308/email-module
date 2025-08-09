# DNSecure Email Module - Complete Usage Guide

> Professional NestJS email service with templates, tracking, queue management, and auto-recovery

[![npm version](https://badge.fury.io/js/dnsecure-email-module.svg)](https://badge.fury.io/js/dnsecure-email-module)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 📚 Table of Contents
- [Features](#-features)
- [Quick Setup](#-quick-setup)
- [Configuration Options](#️-configuration-options)
- [Email Operations](#-email-operations)
- [Template System](#-template-system)
- [Queue Management](#️-queue-management)
- [API Reference](#-api-reference)
- [Extending the Service](#-extending-the-service)
- [Examples](#-examples)
- [Troubleshooting](#-troubleshooting)

## 🌟 Features

- ✅ **Dual Queue System** - Redis (BullMQ) with Memory fallback automatically
- 🔄 **Auto Recovery** - Seamlessly transfers jobs from Memory → Redis when connection restored
- 📧 **SMTP Support** - Gmail, Outlook, custom SMTP servers with OAuth2
- 🎨 **Template Engine** - Handlebars with 10+ built-in templates
- 📊 **Email Tracking** - Track opens, clicks, delivery status in real-time
- 🎛️ **REST API** - Complete Swagger documentation for all endpoints
- 📈 **Analytics** - Performance metrics and dashboard with statistics
- 🔒 **TypeScript** - Full type safety and IntelliSense support
- 🧪 **Zero Dependencies** - Works without Redis setup for development

## 🚀 Quick Setup

### 1. Installation

```bash
npm install dnsecure-email-module
```

### 2. Basic Integration

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailModule, EmailConfigBuilder } from 'dnsecure-email-module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    
    // Your database configuration
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      autoLoadEntities: true,
      synchronize: process.env.NODE_ENV !== 'production',
    }),
    
    // ✅ Email module configuration
    EmailModule.forRoot(
      EmailConfigBuilder
        .create()
        .smtp({
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT),
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        })
        .upstash(process.env.UPSTASH_REDIS_URL)
        .defaults(
          process.env.DEFAULT_FROM_EMAIL,
          process.env.APP_NAME,
          process.env.APP_URL
        )
        .withApi() // Include REST API endpoints
        .build()
    ),
  ],
})
export class AppModule {}
```

### 3. Environment Variables

```env
# SMTP Configuration - Gmail App Password
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587  
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-16-char-app-password  # From Google App Passwords

# Redis - Upstash Free tier (10,000 commands/day)
UPSTASH_REDIS_URL=redis://default:xxx@xxx.upstash.io:6379

# Application Settings
DEFAULT_FROM_EMAIL=noreply@yourapp.com
APP_NAME=Your App Name
APP_URL=https://yourapp.com

# Database - PostgreSQL
DATABASE_URL=postgresql://user:pass@localhost:5432/yourdb
```

### 4. Basic Usage in Service

```typescript
// user.service.ts
import { Injectable } from '@nestjs/common';
import { EmailService } from 'dnsecure-email-module';

@Injectable()
export class UserService {
  constructor(private emailService: EmailService) {}

  async registerUser(userData: any) {
    // ✅ Send welcome email automatically
    await this.emailService.sendWelcomeEmail(
      userData.email, 
      userData.name
    );
    
    // ✅ Send verification email
    await this.emailService.sendVerificationEmail(
      userData.email,
      userData.name,
      'verification-token-123'
    );
  }
}
```

## ⚙️ Configuration Options

### EmailConfigBuilder API

```typescript
const config = EmailConfigBuilder
  .create()
  .smtp({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // true for 465, false for other ports
    user: 'your-email@gmail.com',
    pass: 'your-app-password'
  })
  .upstash('redis://default:xxx@xxx.upstash.io:6379')
  .defaults(
    'noreply@myapp.com',    // from email
    'My Application',       // app name
    'https://myapp.com'     // app URL
  )
  .withApi()  // Include REST API controllers
  .build();
```

### Advanced Configuration

```typescript
EmailModule.forRoot({
  // ✅ SMTP Configuration (required)
  smtp: {
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  
  // ✅ Redis Configuration (optional - uses memory queue as fallback)
  redis: {
    url: process.env.UPSTASH_REDIS_URL,
    // Or specify individual options:
    // host: 'xxx.upstash.io',
    // port: 6379,
    // password: 'xxx',
    // tls: true,
  },
  
  // ✅ Default Settings
  defaults: {
    from: 'noreply@myapp.com',
    appName: 'My Application', 
    appUrl: 'https://myapp.com',
  },
  
  // ✅ Feature Toggles
  features: {
    tracking: true,   // Email open/click tracking
    templates: true,  // Template system
    queue: true,      // Queue processing
  },
  
  // ✅ Include API Controllers
  includeControllers: true, // REST API endpoints
});
```

## 📧 Email Operations

### Built-in Authentication Emails

```typescript
// Authentication emails - templates included
await emailService.sendWelcomeEmail('user@example.com', 'John Doe');
await emailService.sendVerificationEmail('user@example.com', 'John', 'token123');
await emailService.sendPasswordResetEmail('user@example.com', 'John', 'reset-token');
await emailService.sendLoginNotification('user@example.com', 'John', {
  ipAddress: '192.168.1.1',
  location: 'New York, USA',
  device: 'iPhone 12',
  time: new Date()
});

// Security emails  
await emailService.sendTwoFactorBackupCodesEmail('user@example.com', 'John', ['ABC123', 'DEF456']);
await emailService.sendMagicLinkEmail('user@example.com', 'John', 'magic-token');
await emailService.sendVerificationCode('user@example.com', 'John', '123456');
```

### Custom Templated Emails

```typescript
// Send custom email with template
const emailId = await emailService.queueEmail(
  'customer@example.com',
  'Order Confirmed - Thank You!',
  'order-confirmation', // Template name
  {
    customerName: 'John Doe',
    orderNumber: 'ORD-12345',
    orderTotal: '$299.99',
    orderItems: [
      { name: 'Premium Plan', quantity: 1, price: '$299.99' }
    ],
    deliveryDate: '2024-09-15',
    trackingUrl: 'https://shipping.com/track/12345'
  },
  {
    tags: ['order', 'transactional'],
    campaignId: 'order-confirmations-2024',
    trackOpens: true,
    trackClicks: true,
    priority: 'high'
  }
);

console.log(`Email queued with ID: ${emailId}`);
```

### Bulk Emails with Personalization

```typescript
// Send multiple emails with personalized content
const result = await emailService.sendBulkEmails([
  { 
    email: 'customer1@example.com', 
    name: 'John Doe',
    context: { 
      memberLevel: 'VIP',
      expiryDate: '2024-12-31',
      personalOffer: 'Free shipping + 20% off'
    }
  },
  { 
    email: 'customer2@example.com', 
    name: 'Jane Smith',
    context: { 
      memberLevel: 'Gold',
      expiryDate: '2024-06-30',
      personalOffer: '15% off next purchase'
    }
  }
], 
'Your {{memberLevel}} membership expires soon', 
'membership-renewal', 
{
  companyName: 'My Company',
  supportEmail: 'support@mycompany.com',
  currentYear: 2024
},
{
  campaignId: 'membership-renewals-q4-2024',
  tags: ['membership', 'renewal', 'bulk'],
  deliveryTime: new Date('2024-12-01T10:00:00'), // Schedule for 10 AM on Dec 1
  trackOpens: true,
  trackClicks: true
});

console.log(`Queued ${result.queued} emails with batch ID: ${result.batchId}`);
```

### Email Status Tracking

```typescript
// Check email status
const status = await emailService.getEmailStatus(emailId);
console.log(status);
/*
{
  id: 'email-123',
  status: 'opened',     // pending, processing, sent, opened, clicked, bounced, failed
  to: 'user@example.com', 
  subject: 'Welcome Email',
  sentAt: '2024-09-08T10:30:00Z',
  openedAt: '2024-09-08T10:35:00Z',
  clickedAt: null,
  openCount: 2,         // Number of times opened
  clickCount: 0         // Number of link clicks
}
*/

// Resend failed email
const newEmailId = await emailService.resendEmail(failedEmailId);
console.log(`Email resent with new ID: ${newEmailId}`);
```

## 🎨 Template System

### Creating Custom Templates

```typescript
import { EmailTemplateService } from 'dnsecure-email-module';

@Injectable()
export class TemplateManager {
  constructor(private templateService: EmailTemplateService) {}

  async createOrderTemplate() {
    return this.templateService.createTemplate({
      name: 'order-confirmation',
      subject: 'Order {{orderNumber}} Confirmed - {{appName}}',
      description: 'Order confirmation email for customers',
      category: 'transactional',
      content: `
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0; font-size: 24px;">✅ Order Confirmed!</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">{{appName}}</p>
          </div>
          
          <!-- Content -->
          <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <h2 style="color: #667eea;">Hi {{customerName}}!</h2>
            
            <p>Great news! Your order <strong>{{orderNumber}}</strong> has been confirmed and is being processed.</p>
            
            <!-- Order Summary -->
            <div style="background: #f8f9fa; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #667eea;">
              <h3 style="color: #333; margin-top: 0;">📋 Order Summary:</h3>
              <p><strong>Order Number:</strong> {{orderNumber}}</p>
              <p><strong>Total Amount:</strong> <span style="color: #e74c3c; font-weight: bold; font-size: 18px;">{{orderTotal}}</span></p>
              <p><strong>Estimated Delivery:</strong> {{deliveryDate}}</p>
            </div>

            <!-- Order Items -->
            {{#each orderItems}}
            <div style="border-bottom: 1px solid #eee; padding: 15px 0; display: flex; justify-content: space-between;">
              <div>
                <strong style="color: #333;">{{name}}</strong><br>
                <span style="color: #666;">Quantity: {{quantity}}</span>
              </div>
              <div style="text-align: right;">
                <strong style="color: #e74c3c;">{{price}}</strong>
              </div>
            </div>
            {{/each}}
            
            <!-- Action Buttons -->
            <div style="text-align: center; margin: 30px 0;">
              <a href="{{appUrl}}/orders/{{orderNumber}}" 
                 style="background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; display: inline-block; margin-right: 10px;">
                📱 View Order Details
              </a>
              <a href="{{trackingUrl}}" 
                 style="background: #27ae60; color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; display: inline-block;">
                🚚 Track Shipment
              </a>
            </div>
          </div>
          
          <!-- Footer -->
          <div style="background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 12px;">
            <p>Need help? Contact us at {{supportEmail}}</p>
            <p>© {{currentYear}} {{appName}}. All rights reserved.</p>
          </div>
        </body>
        </html>
      `,
      isActive: true
    });
  }
}
```

### Using Handlebars Features

```typescript
// Template with conditionals and loops
const template = `
<h1>Welcome {{name}}!</h1>

{{#ifCond plan '==' 'premium'}}
  <div style="background: gold; padding: 15px; border-radius: 5px;">
    <p>🌟 Thank you for being a Premium member! Enjoy exclusive benefits.</p>
  </div>
{{else}}
  <p>Upgrade to Premium for exclusive benefits and priority support.</p>
{{/ifCond}}

{{#if recentOrders}}
<h3>📦 Your Recent Orders:</h3>
<ul>
{{#each recentOrders}}
  <li>
    <strong>{{name}}</strong> - {{price}} 
    <small>({{formatDate purchaseDate 'short'}})</small>
  </li>
{{/each}}
</ul>
{{/if}}

<p><strong>Current year:</strong> {{currentYear}}</p>
<p><strong>Today:</strong> {{formatDate today 'long'}}</p>
`;

// Built-in Handlebars helpers:
// {{currentYear}} - Current year
// {{formatDate date 'short'}} - MM/DD/YYYY  
// {{formatDate date 'long'}} - MM/DD/YYYY HH:mm:ss
// {{#ifCond value '==' comparison}} - Conditional comparisons
```

### Template Preview

```typescript
// Preview template before saving
const preview = await templateService.previewTemplate(
  template,
  {
    name: 'John Doe',
    plan: 'premium', 
    recentOrders: [
      { 
        name: 'MacBook Pro', 
        price: '$2,399.99',
        purchaseDate: new Date() 
      }
    ],
    today: new Date()
  }
);

console.log(preview.html); // Rendered HTML output
```

## 🎛️ Queue Management

### Queue Status Monitoring

```typescript
import { QueueService } from 'dnsecure-email-module';

@Injectable()
export class QueueMonitoringService {
  constructor(private queueService: QueueService) {}

  async getQueueHealth() {
    const status = await this.queueService.getQueueStatus();
    
    console.log('Queue Status:', {
      waiting: status.waiting,      // Emails waiting to be processed
      active: status.active,        // Emails currently being sent
      completed: status.completed,  // Successfully sent emails
      failed: status.failed,        // Failed emails
      type: status.type,           // 'redis' or 'memory'
      recovery: status.recovery     // Redis recovery information
    });
    
    // Alert if too many emails failed
    if (status.failed > 10) {
      console.warn('⚠️  Too many failed emails, investigation needed!');
    }
    
    return status;
  }

  // ✅ Real-time queue monitoring
  async monitorQueueRealTime() {
    setInterval(async () => {
      const status = await this.getQueueHealth();
      
      if (status.type === 'memory') {
        console.log('💾 Using Memory Queue (Redis unavailable) - jobs will be recovered');
      }
      
      if (status.recovery?.pendingRecovery) {
        console.log(`🔄 Redis recovery in progress - attempt ${status.recovery.recoveryAttempts}/10`);
      }
    }, 30000); // Check every 30 seconds
  }
}
```

## 📊 API Reference

When `withApi()` is configured, these endpoints are automatically available:

### Core Email Operations
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/email/health` | Health check with system status |
| `POST` | `/email/send` | Send single templated email |
| `POST` | `/email/bulk` | Send bulk emails with personalization |
| `POST` | `/email/test` | Send test email (development) |
| `GET` | `/email/status/:emailId` | Get email delivery status |
| `POST` | `/email/retry/:emailId` | Retry failed email |

### Queue Management  
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/email/queue/status` | Basic queue statistics |
| `GET` | `/email/queue/details` | Detailed queue info with recovery status |
| `GET` | `/email/queue/recovery` | Redis recovery monitoring status |

### Template Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/email-templates` | List all templates with filters |
| `GET` | `/email-templates/:name` | Get specific template |
| `POST` | `/email-templates` | Create new template |
| `PUT` | `/email-templates/:id` | Update existing template |
| `DELETE` | `/email-templates/:id` | Delete template |
| `POST` | `/email-templates/preview` | Preview template with context |

### Analytics Dashboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/email-dashboard/stats` | Email statistics for date range |
| `POST` | `/email-dashboard/stats/generate` | Generate daily statistics |
| `GET` | `/email-dashboard/metrics` | Performance metrics (open/click rates) |

### Example API Usage

```bash
# Health check
curl "http://localhost:3000/email/health"

# Send custom email
curl -X POST "http://localhost:3000/email/send" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "test@example.com",
    "subject": "Welcome to our service",
    "template": "welcome",
    "context": {
      "name": "John Doe",
      "loginUrl": "https://myapp.com/login"
    },
    "options": {
      "tags": ["welcome", "onboarding"],
      "priority": "high",
      "trackOpens": true
    }
  }'

# Get queue status
curl "http://localhost:3000/email/queue/details"

# List templates
curl "http://localhost:3000/email-templates"
```

## 🎮 Extending the Service

### Method 1: Extend EmailService (Recommended)

```typescript
// custom-email.service.ts
import { Injectable } from '@nestjs/common';
import { EmailService } from 'dnsecure-email-module';

@Injectable()
export class CustomEmailService extends EmailService {
  
  /**
   * Send invoice email with PDF attachment
   */
  async sendInvoice(
    customerEmail: string,
    customerName: string,
    invoiceData: {
      invoiceNumber: string;
      amount: number;
      dueDate: Date;
      items: Array<{ name: string; quantity: number; price: number }>;
      pdfContent?: string; // Base64 encoded PDF
    }
  ): Promise<string> {
    const attachments = [];
    
    // Add PDF attachment if provided
    if (invoiceData.pdfContent) {
      attachments.push({
        filename: `invoice-${invoiceData.invoiceNumber}.pdf`,
        content: invoiceData.pdfContent,
        contentType: 'application/pdf'
      });
    }

    return this.queueEmail(
      customerEmail,
      `Invoice ${invoiceData.invoiceNumber} - Due ${invoiceData.dueDate.toLocaleDateString()}`,
      'invoice', // Template name
      {
        customerName,
        invoiceNumber: invoiceData.invoiceNumber,
        amount: invoiceData.amount.toFixed(2),
        dueDate: invoiceData.dueDate,
        items: invoiceData.items,
        totalAmount: invoiceData.amount.toFixed(2),
        paymentUrl: `${process.env.APP_URL}/pay/${invoiceData.invoiceNumber}`,
      },
      {
        tags: ['invoice', 'billing'],
        trackOpens: true,
        trackClicks: true,
        attachments,
        priority: 'high',
        campaignId: 'invoices-2024'
      }
    );
  }

  /**
   * Send subscription renewal reminder with smart scheduling
   */
  async sendSubscriptionRenewal(
    userEmail: string,
    userData: {
      name: string;
      plan: string;
      expiryDate: Date;
      renewalPrice: number;
      discountCode?: string;
    }
  ): Promise<string> {
    const daysUntilExpiry = Math.ceil(
      (userData.expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );

    return this.queueEmail(
      userEmail,
      `Your ${userData.plan} subscription expires in ${daysUntilExpiry} days`,
      'subscription-renewal',
      {
        name: userData.name,
        plan: userData.plan,
        expiryDate: userData.expiryDate,
        renewalPrice: userData.renewalPrice.toFixed(2),
        daysUntilExpiry,
        discountCode: userData.discountCode,
        renewalUrl: `${process.env.APP_URL}/billing/renew`,
        upgradeUrl: `${process.env.APP_URL}/billing/upgrade`,
      },
      {
        tags: ['subscription', 'renewal', 'billing'],
        campaignId: 'subscription-renewals-2024',
        trackOpens: true,
        trackClicks: true,
        priority: daysUntilExpiry <= 3 ? 'high' : 'normal',
        deliveryTime: daysUntilExpiry > 7 ? 
          new Date(Date.now() + 24 * 60 * 60 * 1000) : // Send tomorrow if > 7 days
          undefined // Send immediately if <= 7 days
      }
    );
  }
}
```

### Method 2: Using Custom Service in Your App

```typescript
// app.module.ts
@Module({
  imports: [
    EmailModule.forRoot(/* your config */),
  ],
  providers: [
    CustomEmailService, // Register your extended service
  ],
  exports: [CustomEmailService],
})
export class AppModule {}

// invoice.controller.ts
@Controller('invoices')
export class InvoiceController {
  constructor(private customEmailService: CustomEmailService) {}

  @Post('send')
  async sendInvoice(@Body() invoiceData: any) {
    try {
      const emailId = await this.customEmailService.sendInvoice(
        invoiceData.customerEmail,
        invoiceData.customerName,
        {
          invoiceNumber: invoiceData.number,
          amount: invoiceData.total,
          dueDate: new Date(invoiceData.dueDate),
          items: invoiceData.items,
          pdfContent: invoiceData.pdfBase64
        }
      );

      return {
        success: true,
        message: 'Invoice email sent successfully',
        emailId
      };
    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  }
}
```

## 📖 Examples

### Example 1: E-commerce Integration

```typescript
@Injectable()
export class OrderService {
  constructor(private emailService: EmailService) {}

  async processOrder(orderData: any) {
    // Process order...
    const order = await this.createOrder(orderData);

    // Send confirmation email
    await this.emailService.queueEmail(
      order.customerEmail,
      `Order ${order.number} Confirmed`,
      'order-confirmation',
      {
        customerName: order.customerName,
        orderNumber: order.number,
        orderTotal: order.total,
        orderItems: order.items,
        deliveryDate: order.estimatedDelivery,
        trackingUrl: `${process.env.APP_URL}/track/${order.trackingNumber}`,
      },
      {
        tags: ['order', 'confirmation'],
        trackOpens: true,
        trackClicks: true,
      }
    );

    return order;
  }
}
```

### Example 2: User Authentication Flow

```typescript
@Injectable() 
export class AuthService {
  constructor(private emailService: EmailService) {}

  async registerUser(userData: any) {
    const user = await this.createUser(userData);
    const verificationToken = this.generateToken();

    // Send welcome + verification
    await this.emailService.sendVerificationEmail(
      user.email,
      user.name, 
      verificationToken
    );

    return user;
  }

  async sendPasswordReset(email: string) {
    const user = await this.findUserByEmail(email);
    if (!user) throw new Error('User not found');

    const resetToken = this.generateResetToken(user.id);
    
    await this.emailService.sendPasswordResetEmail(
      user.email,
      user.name,
      resetToken
    );
  }
}
```

### Example 3: Marketing Campaigns

```typescript
@Injectable()
export class MarketingService {
  constructor(private emailService: EmailService) {}

  async sendNewsletterCampaign(segmentId: string) {
    const subscribers = await this.getSubscribersBySegment(segmentId);
    
    const campaignId = `newsletter-${Date.now()}`;
    
    const recipients = subscribers.map(sub => ({
      email: sub.email,
      name: sub.name,
      context: {
        subscriptionType: sub.plan,
        customOffers: sub.getPersonalizedOffers(),
        unsubscribeUrl: `${process.env.APP_URL}/unsubscribe/${sub.token}`,
      }
    }));

    const result = await this.emailService.sendBulkEmails(
      recipients,
      'Monthly Newsletter - {{month}}',
      'newsletter-template',
      {
        month: new Date().toLocaleDateString('en', { month: 'long' }),
        companyNews: await this.getCompanyNews(),
        featuredProducts: await this.getFeaturedProducts(),
      },
      {
        campaignId,
        tags: ['newsletter', 'marketing'],
        deliveryTime: this.scheduleOptimalTime(),
      }
    );

    return {
      campaignId,
      scheduled: result.queued,
      estimatedDelivery: this.scheduleOptimalTime(),
    };
  }
}
```

## 🔧 Development Mode

Run standalone server with Swagger API for testing:

```bash
# Clone repository
git clone https://github.com/danhnhdeveloper308/email-module.git
cd email-service

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your credentials

# Start development server
npm run dev:standalone
```

**Access Points:**
- **Swagger API**: http://localhost:3000/api
- **Health Check**: http://localhost:3000/email/health
- **Send Test Email**: POST http://localhost:3000/email/test
- **Queue Status**: http://localhost:3000/email/queue/details

## 🔍 Troubleshooting

### Common Issues

#### 1. "Template not found" Error

```typescript
// Make sure template exists
const templates = await emailService.getTemplates();
console.log('Available templates:', templates.map(t => t.name));

// Create missing template
await emailService.saveTemplate(
  'missing-template',
  '<h1>Hello {{name}}!</h1>',
  { subject: 'Hello!', description: 'Simple greeting' }
);
```

#### 2. Redis Connection Issues

**Symptoms:**

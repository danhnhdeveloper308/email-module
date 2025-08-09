# Email Module Architecture

## Overview

The DNSecure Email Module is a comprehensive NestJS-based email service designed as a reusable library. It provides queue-based email processing, template management, tracking capabilities, and analytics.

## Core Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Controllers   │    │    Services     │    │   Processors    │
│                 │    │                 │    │                 │
│ • EmailController│────│ • EmailService  │────│ • EmailProcessor│
│ • TemplateCtrl  │    │ • TrackingService│    │                 │
│ • DashboardCtrl │    │ • TemplateService│    │                 │
└─────────────────┘    │ • StatsService  │    └─────────────────┘
                       │ • OAuth2Service │
                       └─────────────────┘
                                │
                       ┌─────────────────┐
                       │   Data Layer    │
                       │                 │
                       │ • EmailLog      │
                       │ • EmailTemplate │
                       │ • EmailEvent    │
                       │ • EmailStats    │
                       │ • OAuthCred     │
                       └─────────────────┘
```

## Module Structure

### Core Components

1. **EmailModule** - Main module with forRoot/forRootAsync patterns
2. **EmailService** - Primary service for email operations
3. **EmailProcessor** - BullMQ processor for queue handling
4. **Controllers** - REST API endpoints
5. **Entities** - TypeORM database entities

### Services Layer

- **EmailService**: Core email functionality
- **EmailTrackingService**: Open/click tracking
- **EmailTemplateService**: Template management
- **EmailStatsService**: Analytics and reporting
- **OAuth2Service**: OAuth2 authentication for providers

### Data Flow

```
API Request → Controller → Service → Queue → Processor → SMTP → Email Sent
                    ↓
            Database Logging ← Event Tracking ← Email Delivered
```

## Queue Architecture

### BullMQ Integration

```typescript
// Queue Configuration
BullModule.registerQueue({
  name: 'email',
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: true,
    removeOnFail: false,
  },
});
```

### Job Types

1. **send-email**: Individual email processing
2. **send-bulk-email**: Bulk email processing
3. **retry-failed**: Retry failed emails

### Processing Flow

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│Queue Email  │───▶│Process Job  │───▶│Send Email   │
│             │    │             │    │             │
│• Validate   │    │• Compile    │    │• SMTP       │
│• Enqueue    │    │• Template   │    │• Log Result │
│• Log        │    │• Send       │    │• Track      │
└─────────────┘    └─────────────┘    └─────────────┘
```

## Template System

### Handlebars Integration

```typescript
// Template Compilation
const template = Handlebars.compile(templateContent);
const html = template(context);
```

### Helper Functions

- `currentYear`: Current year
- `formatDate`: Date formatting
- `ifCond`: Conditional helper

### Template Categories

- **authentication**: Login, verification emails
- **notification**: System notifications
- **marketing**: Promotional emails
- **transactional**: Order confirmations, receipts
- **onboarding**: Welcome sequences

## Tracking System

### Event Types

```typescript
enum EmailEventType {
  SENT = 'sent',
  DELIVERED = 'delivered',
  OPENED = 'opened',
  CLICKED = 'clicked',
  BOUNCED = 'bounced',
  FAILED = 'failed',
}
```

### Tracking Implementation

1. **Open Tracking**: 1x1 pixel image
2. **Click Tracking**: URL rewriting
3. **Event Storage**: Database logging
4. **Analytics**: Aggregated statistics

## Database Schema

### Core Tables

- `email_logs`: Email send history
- `email_templates`: Template definitions
- `email_events`: Tracking events
- `email_stats`: Daily statistics
- `oauth_credentials`: OAuth tokens

### Relationships

```sql
email_logs (1) ─── (N) email_events
email_templates (1) ─── (N) email_logs
email_stats ─── aggregated from email_logs
```

## Security Considerations

### OAuth2 Flow

```typescript
// Token Management
private async refreshToken(refreshToken: string): Promise<string> {
  // Secure token refresh implementation
  // Cache management with expiry
  // Error handling and retry logic
}
```

### Data Protection

- Sensitive data encryption
- Token secure storage
- Input validation and sanitization
- SQL injection prevention

## Performance Optimizations

### Caching Strategy

1. **Template Caching**: Compiled templates in memory
2. **Token Caching**: OAuth2 tokens with expiry
3. **Database Indexing**: Optimized queries

### Queue Management

- Job prioritization
- Bulk processing
- Failed job retry with exponential backoff
- Dead letter queue handling

## Error Handling

### Retry Logic

```typescript
// Job Configuration
{
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 5000,
  }
}
```

### Error Categories

1. **Transient Errors**: Network issues, temporary failures
2. **Permanent Errors**: Invalid email, authentication
3. **Rate Limiting**: Provider-specific limits

## Extensibility

### Provider Pattern

The architecture supports multiple email providers:

```typescript
interface EmailProvider {
  send(options: EmailOptions): Promise<SendResult>;
  verify(): Promise<boolean>;
}
```

### Plugin System

- Custom template helpers
- Event listeners
- Middleware integration
- Custom processors

## Deployment Considerations

### Docker Support

```yaml
services:
  redis: # Queue storage
  postgres: # Data persistence
  mailhog: # Development SMTP
```

### Environment Variables

- SMTP configuration
- OAuth2 credentials
- Database connections
- Redis configuration

## Monitoring & Logging

### Health Checks

- Database connectivity
- Redis availability
- SMTP server status
- Queue health

### Metrics

- Email delivery rates
- Queue processing times
- Error rates
- Template usage statistics

## Testing Strategy

### Unit Tests

- Service method testing
- Template compilation
- Queue job processing

### Integration Tests

- Database operations
- SMTP connectivity
- OAuth2 authentication

### E2E Tests

- API endpoint testing
- Complete email flow
- Tracking functionality

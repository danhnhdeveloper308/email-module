# API Documentation - DN Secure Email Module

## Base URL

```
http://localhost:3000
```

## Authentication

Currently no authentication required for development. In production, implement API keys or JWT tokens.

## Content Type

All requests and responses use `application/json` unless otherwise specified.

---

## Email Operations

### Send Single Email

Send a single email using a template.

**Endpoint:** `POST /email/send`

**Request Body:**

```json
{
  "to": "user@example.com",
  "subject": "Welcome to Our Service",
  "template": "welcome",
  "context": {
    "name": "John Doe",
    "loginUrl": "https://myapp.com/login"
  },
  "options": {
    "tags": ["welcome", "onboarding"],
    "priority": "high",
    "trackOpens": true,
    "trackClicks": true,
    "campaignId": "welcome-2024"
  }
}
```

**Response:**

```json
{
  "success": true,
  "message": "Email queued successfully",
  "emailId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Status Codes:**

- 200: Success
- 400: Bad Request
- 500: Internal Server Error

---

### Send Bulk Emails

Send multiple emails with personalized content.

**Endpoint:** `POST /email/bulk`

**Request Body:**

```json
{
  "recipients": [
    {
      "email": "user1@example.com",
      "name": "John Doe",
      "context": {
        "subscriptionType": "premium",
        "expiryDate": "2024-12-31"
      }
    },
    {
      "email": "user2@example.com",
      "name": "Jane Smith",
      "context": {
        "subscriptionType": "basic",
        "expiryDate": "2024-06-30"
      }
    }
  ],
  "subject": "Your {{subscriptionType}} subscription expires soon",
  "template": "subscription-reminder",
  "context": {
    "companyName": "MyApp Inc",
    "supportEmail": "support@myapp.com"
  },
  "options": {
    "campaignId": "subscription-reminder-q1-2024",
    "tags": ["subscription", "reminder"]
  }
}
```

**Response:**

```json
{
  "success": true,
  "message": "Bulk emails queued successfully",
  "batchId": "batch-550e8400-e29b-41d4-a716-446655440000",
  "queued": 2
}
```

---

### Get Email Status

Check the status of a sent email.

**Endpoint:** `GET /email/status/{emailId}`

**Parameters:**

- `emailId` (path): The email ID returned when sending

**Response:**

```json
{
  "success": true,
  "status": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "opened",
    "to": "user@example.com",
    "subject": "Welcome Email",
    "sentAt": "2024-01-15T10:30:00Z",
    "openedAt": "2024-01-15T10:35:00Z",
    "clickedAt": null
  }
}
```

**Email Statuses:**

- `pending`: Queued for processing
- `processing`: Currently being sent
- `sent`: Successfully sent
- `delivered`: Delivered to recipient
- `opened`: Email was opened
- `clicked`: Link in email was clicked
- `bounced`: Email bounced
- `failed`: Failed to send

---

### Retry Failed Email

Resend a failed email.

**Endpoint:** `POST /email/retry/{emailId}`

**Response:**

```json
{
  "success": true,
  "message": "Email retried successfully",
  "newEmailId": "660e8400-e29b-41d4-a716-446655440001"
}
```

---

### Send Test Email

Send a test email for development.

**Endpoint:** `POST /email/test`

**Response:**

```json
{
  "success": true,
  "message": "Test email sent successfully",
  "emailId": "test-550e8400-e29b-41d4-a716-446655440000"
}
```

---

### Health Check

Check if the email service is healthy.

**Endpoint:** `GET /email/health`

**Response:**

```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "service": "email-module",
  "version": "1.0.0"
}
```

---

## Queue Management

### Get Queue Status

Get basic queue statistics.

**Endpoint:** `GET /email/queue/status`

**Response:**

```json
{
  "success": true,
  "queue": {
    "waiting": 5,
    "active": 2,
    "completed": 150,
    "failed": 3
  }
}
```

---

### Get Detailed Queue Status

Get detailed queue information including recent failed jobs.

**Endpoint:** `GET /email/queue/details`

**Response:**

```json
{
  "success": true,
  "stats": {
    "waiting": 5,
    "active": 2,
    "completed": 150,
    "failed": 3,
    "delayed": 0
  },
  "jobs": {
    "recent_failed": [
      {
        "id": "job-123",
        "data": {
          "emailId": "email-456",
          "to": "invalid@email",
          "subject": "Test"
        },
        "error": "Invalid email address",
        "timestamp": "2024-01-15T10:25:00Z"
      }
    ]
  }
}
```

---

## Template Management

### List Templates

Get all email templates.

**Endpoint:** `GET /email-templates`

**Query Parameters:**

- `category` (optional): Filter by category
- `active` (optional): Filter by active status
- `search` (optional): Search in name/description

**Response:**

```json
{
  "success": true,
  "templates": [
    {
      "id": "template-123",
      "name": "welcome",
      "subject": "Welcome to {{appName}}",
      "description": "Welcome email for new users",
      "category": "onboarding",
      "isActive": true,
      "version": 2,
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-10T00:00:00Z"
    }
  ]
}
```

---

### Get Template by Name

Get a specific template by name.

**Endpoint:** `GET /email-templates/{name}`

**Response:**

```json
{
  "success": true,
  "template": {
    "id": "template-123",
    "name": "welcome",
    "subject": "Welcome to {{appName}}",
    "description": "Welcome email for new users",
    "content": "<html><body><h1>Welcome {{name}}!</h1></body></html>",
    "category": "onboarding",
    "isActive": true,
    "version": 2
  }
}
```

---

### Create Template

Create a new email template.

**Endpoint:** `POST /email-templates`

**Request Body:**

```json
{
  "name": "order-confirmation",
  "subject": "Order Confirmed - {{orderNumber}}",
  "description": "Order confirmation email",
  "content": "<html><body><h1>Order {{orderNumber}} Confirmed</h1><p>Thank you {{customerName}}!</p></body></html>",
  "category": "transactional",
  "isActive": true
}
```

**Response:**

```json
{
  "success": true,
  "template": {
    "id": "new-template-456",
    "name": "order-confirmation",
    "subject": "Order Confirmed - {{orderNumber}}",
    "description": "Order confirmation email",
    "content": "<html><body><h1>Order {{orderNumber}} Confirmed</h1><p>Thank you {{customerName}}!</p></body></html>",
    "category": "transactional",
    "isActive": true,
    "version": 1,
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

---

### Update Template

Update an existing template.

**Endpoint:** `PUT /email-templates/{id}`

**Request Body:**

```json
{
  "subject": "Updated Order Confirmation - {{orderNumber}}",
  "content": "<html><body><h1>Your Order {{orderNumber}} is Confirmed!</h1></body></html>",
  "isActive": true
}
```

**Response:**

```json
{
  "success": true,
  "template": {
    "id": "template-456",
    "name": "order-confirmation",
    "subject": "Updated Order Confirmation - {{orderNumber}}",
    "content": "<html><body><h1>Your Order {{orderNumber}} is Confirmed!</h1></body></html>",
    "version": 2,
    "updatedAt": "2024-01-15T10:35:00Z"
  }
}
```

---

### Delete Template

Delete a template.

**Endpoint:** `DELETE /email-templates/{id}`

**Response:**

```json
{
  "success": true,
  "message": "Template deleted successfully"
}
```

---

### Preview Template

Preview how a template will look with specific context.

**Endpoint:** `POST /email-templates/preview`

**Request Body:**

```json
{
  "template": "<h1>Hello {{name}}!</h1><p>Welcome to {{appName}}.</p>",
  "context": {
    "name": "John Doe",
    "appName": "My Application"
  }
}
```

**Response:**

```json
{
  "success": true,
  "html": "<h1>Hello John Doe!</h1><p>Welcome to My Application.</p>",
  "context": {
    "name": "John Doe",
    "appName": "My Application"
  }
}
```

---

## Analytics & Dashboard

### Get Email Statistics

Get email statistics for a date range.

**Endpoint:** `GET /email-dashboard/stats`

**Query Parameters:**

- `startDate` (optional): Start date (YYYY-MM-DD)
- `endDate` (optional): End date (YYYY-MM-DD)

**Response:**

```json
{
  "success": true,
  "stats": [
    {
      "date": "2024-01-15",
      "sent": 100,
      "delivered": 98,
      "opened": 65,
      "clicked": 15,
      "bounced": 1,
      "failed": 1
    }
  ],
  "period": {
    "start": "2024-01-01T00:00:00Z",
    "end": "2024-01-31T23:59:59Z"
  }
}
```

---

### Generate Daily Stats

Generate statistics for a specific date.

**Endpoint:** `POST /email-dashboard/stats/generate`

**Query Parameters:**

- `date` (optional): Date to generate stats for (YYYY-MM-DD)

**Response:**

```json
{
  "success": true,
  "message": "Daily stats generated successfully",
  "stats": {
    "date": "2024-01-15",
    "sent": 100,
    "delivered": 98,
    "opened": 65,
    "clicked": 15,
    "bounced": 1,
    "failed": 1
  }
}
```

---

### Get Performance Metrics

Get calculated performance metrics.

**Endpoint:** `GET /email-dashboard/metrics`

**Query Parameters:**

- `period` (optional): Time period (24h, 7d, 30d, 90d)
- `template` (optional): Filter by template name

**Response:**

```json
{
  "success": true,
  "metrics": {
    "deliveryRate": "98.00",
    "openRate": "66.33",
    "clickRate": "23.08",
    "clickToOpenRate": "23.08",
    "totalSent": 1000,
    "totalDelivered": 980,
    "totalOpened": 650,
    "totalClicked": 150
  },
  "period": {
    "start": "2024-01-01T00:00:00Z",
    "end": "2024-01-31T23:59:59Z"
  },
  "daily_stats": [
    {
      "date": "2024-01-15",
      "sent": 100,
      "delivered": 98,
      "opened": 65,
      "clicked": 15
    }
  ]
}
```

---

## OAuth2 Management

### Get Gmail Authorization URL

Get the URL to authorize Gmail OAuth2.

**Endpoint:** `GET /oauth2/gmail/auth-url`

**Response:**

```json
{
  "success": true,
  "authUrl": "https://accounts.google.com/o/oauth2/v2/auth?client_id=...",
  "instructions": [
    "1. Visit the authorization URL",
    "2. Grant permissions",
    "3. Copy the authorization code from the callback URL",
    "4. Use POST /oauth2/gmail/token to exchange code for tokens"
  ]
}
```

---

### Exchange Authorization Code

Exchange authorization code for access tokens.

**Endpoint:** `POST /oauth2/gmail/token`

**Request Body:**

```json
{
  "code": "authorization-code-from-google"
}
```

**Response:**

```json
{
  "success": true,
  "message": "OAuth2 setup completed. Tokens saved to database."
}
```

---

### Test OAuth2 Connection

Test if OAuth2 connection is working.

**Endpoint:** `GET /oauth2/gmail/test`

**Response:**

```json
{
  "success": true,
  "message": "OAuth2 connection successful",
  "tokenPreview": "ya29.a0ARrdaM8j1J2K3..."
}
```

---

## Error Responses

All error responses follow this format:

```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error information",
  "statusCode": 400
}
```

### Common Error Codes

- **400 Bad Request**: Invalid request data
- **404 Not Found**: Resource not found
- **422 Unprocessable Entity**: Validation errors
- **500 Internal Server Error**: Server errors

### Example Error Response

```json
{
  "success": false,
  "message": "Template compilation failed",
  "error": "Missing closing tag for {{#each}} helper",
  "statusCode": 400
}
```

---

## Rate Limiting

Current implementation doesn't have rate limiting. In production, consider:

- **Per IP**: 100 requests/minute
- **Per API Key**: 1000 requests/minute
- **Bulk emails**: 10 requests/minute

---

## Webhooks (Future Feature)

Plan to support webhooks for email events:

```json
{
  "event": "email.opened",
  "emailId": "550e8400-e29b-41d4-a716-446655440000",
  "recipient": "user@example.com",
  "timestamp": "2024-01-15T10:35:00Z",
  "metadata": {
    "userAgent": "Mozilla/5.0...",
    "ipAddress": "192.168.1.1"
  }
}
```

---

## SDKs and Libraries

### cURL Examples

```bash
# Send email
curl -X POST "http://localhost:3000/email/send" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "test@example.com",
    "subject": "Test Email",
    "template": "welcome",
    "context": {"name": "Test User"}
  }'

# Get templates
curl "http://localhost:3000/email-templates"

# Get queue status
curl "http://localhost:3000/email/queue/details"
```

### JavaScript/TypeScript

```typescript
// Using fetch
const response = await fetch('http://localhost:3000/email/send', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    to: 'user@example.com',
    subject: 'Welcome!',
    template: 'welcome',
    context: {name: 'John Doe'},
  }),
});

const result = await response.json();
console.log(result);
```

### Python

```python
import requests

# Send email
response = requests.post('http://localhost:3000/email/send', json={
    'to': 'user@example.com',
    'subject': 'Welcome!',
    'template': 'welcome',
    'context': {'name': 'John Doe'}
})

print(response.json())
```

---

This API documentation provides complete reference for all available endpoints in the DN Secure Email Module. For implementation examples and guides, refer to the [Usage Guide](./USAGE_GUIDE.md).

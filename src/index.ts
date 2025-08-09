// =============================================================================
// DNSecure Email Module - Library Exports
// Professional email service for NestJS applications
// =============================================================================

// Main Module
export { EmailModule } from './email.module';

// Core Services
export { EmailService } from './services/email.service';
export { EmailTemplateService } from './services/email-template.service';
export { EmailTrackingService } from './services/email-tracking.service';
export { EmailStatsService } from './services/email-stats.service';

// ✅ Queue Services - Export for extensibility
export { QueueService } from './services/queue.service';
export { MemoryQueueService } from './services/memory-queue.service';
export { OAuth2Service } from './services/oauth2.service';

// ✅ Processors - Export for custom processing
export { EmailProcessor } from './processors/email.processor';

// Configuration Interfaces
export {
  EmailModuleOptions,
  EmailModuleAsyncOptions,
  EmailModuleOptionsFactory,
  EmailConfigBuilder
} from './interfaces/email-module-options.interface';

export {
  IEmailService,
  EmailOptions,
  LoginInfo,
  EmailAttachment,
} from './interfaces/email.interface';

// ✅ Queue Interfaces - Export for queue integration
export {
  QueueJob,
  QueueStats,
  QueueRecoveryInfo,
} from './interfaces/queue-job.interface';

// Entities (for TypeORM integration)
export { EmailLog, EmailStatus } from './entities/email-log.entity';
export { EmailTemplate } from './entities/email-template.entity';
export { EmailEvent, EmailEventType } from './entities/email-event.entity';
export { EmailStats } from './entities/email-stats.entity';
export { OAuthCredential } from './entities/oauth-credential.entity';

// DTOs for API validation
export { SendEmailDto } from './dto/send-email.dto';
export { CreateTemplateDto } from './dto/create-template.dto';
export { UpdateTemplateDto } from './dto/update-template.dto';
export { BulkEmailDto } from './dto/bulk-email.dto';

// ✅ Controllers - Export for custom API integration
export { EmailController } from './controllers/email.controller';
export { EmailTemplateController } from './controllers/email-template.controller';
export { EmailDashboardController } from './controllers/email-dashboard.controller';
export { OAuth2Controller } from './controllers/oauth2.controller';

// Constants
export * from './constants';

// Decorators (optional utilities)
export * from './decorators';

// =============================================================================
// Quick Start Example:
// 
// import { EmailModule, EmailService } from 'dnsecure-email-module';
// 
// @Module({
//   imports: [
//     EmailModule.forRoot({
//       smtp: {
//         host: 'smtp.gmail.com',
//         port: 587,
//         user: process.env.SMTP_USER,
//         pass: process.env.SMTP_PASS,
//       },
//       redis: {
//         url: process.env.UPSTASH_REDIS_URL,
//       },
//     }),
//   ],
// })
// export class AppModule {}
//
// @Injectable()
// export class MyService {
//   constructor(private emailService: EmailService) {}
//
//   async sendWelcome(email: string, name: string) {
//     return this.emailService.sendWelcomeEmail(email, name);
//   }
// }
// =============================================================================
// Advanced Usage Examples for Maximum Extensibility:
// 
// 1. EXTEND EMAIL SERVICE:
// import { EmailService } from 'dnsecure-email-module';
// export class CustomEmailService extends EmailService { ... }
// 
// 2. CUSTOM QUEUE INTEGRATION:
// import { QueueService, QueueJob } from 'dnsecure-email-module';
// export class CustomQueueProcessor { ... }
//
// 3. CUSTOM EMAIL PROCESSOR:
// import { EmailProcessor, EmailService } from 'dnsecure-email-module';
// export class CustomEmailProcessor extends EmailProcessor { ... }
//
// 4. CUSTOM CONTROLLERS:
// import { EmailController } from 'dnsecure-email-module';
// export class CustomEmailController extends EmailController { ... }
//
// 5. DIRECT SERVICE USAGE:
// import { EmailService, QueueService, EmailTemplateService } from 'dnsecure-email-module';
// =============================================================================

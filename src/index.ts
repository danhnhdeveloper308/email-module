// Main module exports
export {EmailModule} from './email.module';

// Services exports
export {EmailService} from './services/email.service';
export {EmailTrackingService} from './services/email-tracking.service';
export {OAuth2Service} from './services/oauth2.service';
export {EmailTemplateService} from './services/email-template.service';
export {EmailStatsService} from './services/email-stats.service';

// Entities exports
export {EmailLog, EmailStatus} from './entities/email-log.entity';
export {EmailTemplate} from './entities/email-template.entity';
export {EmailEvent, EmailEventType} from './entities/email-event.entity';
export {EmailStats} from './entities/email-stats.entity';
export {OAuthCredential} from './entities/oauth-credential.entity';

// Interfaces exports
export {
  IEmailService,
  EmailOptions,
  LoginInfo,
  EmailAttachment,
} from './interfaces/email.interface';
export {
  EmailModuleOptions,
  EmailModuleAsyncOptions,
  EmailModuleOptionsFactory,
} from './interfaces/email-module-options.interface';

// DTOs exports
export {SendEmailDto} from './dto/send-email.dto';
export {CreateTemplateDto} from './dto/create-template.dto';
export {UpdateTemplateDto} from './dto/update-template.dto';

// Constants exports
export * from './constants';

// Decorators exports
export * from './decorators';

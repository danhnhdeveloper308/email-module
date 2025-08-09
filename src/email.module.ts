import { Module, DynamicModule, Provider, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';

// Core Services
import { EmailService } from './services/email.service';
import { EmailTemplateService } from './services/email-template.service';
import { EmailTrackingService } from './services/email-tracking.service';
import { EmailStatsService } from './services/email-stats.service';

// Queue Services - ✅ Only keep QueueService and MemoryQueueService as fallback
import { QueueService } from './services/queue.service';
import { MemoryQueueService } from './services/memory-queue.service';

// Controllers (for standalone mode)
import { EmailController } from './controllers/email.controller';
import { EmailTemplateController } from './controllers/email-template.controller';
import { EmailDashboardController } from './controllers/email-dashboard.controller';
import { OAuth2Controller } from './controllers/oauth2.controller';

// Processors
import { EmailProcessor } from './processors/email.processor';

// Entities
import { EmailLog } from './entities/email-log.entity';
import { EmailTemplate } from './entities/email-template.entity';
import { EmailEvent } from './entities/email-event.entity';
import { EmailStats } from './entities/email-stats.entity';
import { OAuthCredential } from './entities/oauth-credential.entity';

// Interfaces
import {
  EmailModuleOptions,
  EmailModuleAsyncOptions,
  EmailModuleOptionsFactory,
} from './interfaces/email-module-options.interface';

// Constants
import { EMAIL_MODULE_OPTIONS_TOKEN, EMAIL_SERVICE_TOKEN, EMAIL_STATS_SERVICE_TOKEN, EMAIL_TEMPLATE_SERVICE_TOKEN, EMAIL_TRACKING_SERVICE_TOKEN } from './constants';
import { OAuth2Service } from './services/oauth2.service';

@Global()
@Module({})
export class EmailModule {
  /**
   * Configure EmailModule with static options
   */
  static forRoot(options: EmailModuleOptions): DynamicModule {
    const optionsProvider: Provider = {
      provide: EMAIL_MODULE_OPTIONS_TOKEN,
      useValue: options,
    };

    return {
      module: EmailModule,
      imports: [
        ConfigModule,
        TypeOrmModule.forFeature([
          EmailLog,
          EmailTemplate,
          EmailEvent,
          EmailStats,
          OAuthCredential,
        ]),
      ],
      controllers: options.includeControllers ? [
        EmailController,
        EmailTemplateController,
        EmailDashboardController,
        OAuth2Controller,
      ] : [],
      providers: [
        optionsProvider,
        // ✅ Simplified queue services - only QueueService and MemoryQueue fallback
        QueueService,
        MemoryQueueService,
        // Core Services
        EmailService,
        EmailTemplateService,
        EmailTrackingService,
        EmailStatsService,
        OAuth2Service,
        EmailProcessor,
        // Token providers for controllers
        {
          provide: EMAIL_SERVICE_TOKEN,
          useExisting: EmailService,
        },
        {
          provide: EMAIL_TEMPLATE_SERVICE_TOKEN,
          useExisting: EmailTemplateService,
        },
        {
          provide: EMAIL_TRACKING_SERVICE_TOKEN,
          useExisting: EmailTrackingService,
        },
        {
          provide: EMAIL_STATS_SERVICE_TOKEN,
          useExisting: EmailStatsService,
        },
      ],
      exports: [
        EmailService,
        EmailTemplateService,
        EmailTrackingService,
        EmailStatsService,
        QueueService,
        OAuth2Service,
        // Export tokens as well
        EMAIL_SERVICE_TOKEN,
        EMAIL_TEMPLATE_SERVICE_TOKEN,
        EMAIL_TRACKING_SERVICE_TOKEN,
        EMAIL_STATS_SERVICE_TOKEN,
      ],
    };
  }

  /**
   * Configure EmailModule with async options
   */
  static forRootAsync(options: EmailModuleAsyncOptions): DynamicModule {
    const asyncProviders = this.createAsyncProviders(options);

    return {
      module: EmailModule,
      imports: [
        ConfigModule,
        TypeOrmModule.forFeature([
          EmailLog,
          EmailTemplate,
          EmailEvent,
          EmailStats,
          OAuthCredential,
        ]),
        ...(options.imports || []),
      ],
      controllers: [
        EmailController,
        EmailTemplateController,
        EmailDashboardController,
        OAuth2Controller,
      ],
      providers: [
        ...asyncProviders,
        // ✅ Simplified queue services
        QueueService,
        MemoryQueueService,
        // Core Services
        EmailService,
        EmailTemplateService,
        EmailTrackingService,
        EmailStatsService,
        OAuth2Service,
        EmailProcessor,
        // Token providers for controllers
        {
          provide: EMAIL_SERVICE_TOKEN,
          useExisting: EmailService,
        },
        {
          provide: EMAIL_TEMPLATE_SERVICE_TOKEN,
          useExisting: EmailTemplateService,
        },
        {
          provide: EMAIL_TRACKING_SERVICE_TOKEN,
          useExisting: EmailTrackingService,
        },
        {
          provide: EMAIL_STATS_SERVICE_TOKEN,
          useExisting: EmailStatsService,
        },
      ],
      exports: [
        EmailService,
        EmailTemplateService,
        EmailTrackingService,
        EmailStatsService,
        QueueService,
        OAuth2Service,
        // Export tokens as well
        EMAIL_SERVICE_TOKEN,
        EMAIL_TEMPLATE_SERVICE_TOKEN,
        EMAIL_TRACKING_SERVICE_TOKEN,
        EMAIL_STATS_SERVICE_TOKEN,
      ],
    };
  }

  private static createAsyncProviders(options: EmailModuleAsyncOptions): Provider[] {
    if (options.useExisting || options.useFactory) {
      return [this.createAsyncOptionsProvider(options)];
    }

    return [
      this.createAsyncOptionsProvider(options),
      {
        provide: options.useClass!,
        useClass: options.useClass!,
      },
    ];
  }

  private static createAsyncOptionsProvider(options: EmailModuleAsyncOptions): Provider {
    if (options.useFactory) {
      return {
        provide: EMAIL_MODULE_OPTIONS_TOKEN,
        useFactory: options.useFactory,
        inject: options.inject || [],
      };
    }

    return {
      provide: EMAIL_MODULE_OPTIONS_TOKEN,
      useFactory: async (optionsFactory: EmailModuleOptionsFactory) =>
        await optionsFactory.createEmailModuleOptions(),
      inject: [options.useExisting || options.useClass!],
    };
  }
}

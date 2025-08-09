import {Module, DynamicModule, Provider, Global} from '@nestjs/common';
import {TypeOrmModule} from '@nestjs/typeorm';
import {BullModule} from '@nestjs/bullmq';
import {ConfigModule, ConfigService} from '@nestjs/config';

// Services
import {EmailService} from './services/email.service';

// Controllers
import {EmailController} from './controllers/email.controller';
import {OAuth2Controller} from './controllers/oauth2.controller';

// Processors
import {EmailProcessor} from './processors/email.processor';

// Entities
import {EmailLog} from './entities/email-log.entity';
import {EmailTemplate} from './entities/email-template.entity';
import {EmailEvent} from './entities/email-event.entity';

// Interfaces
import {
  EmailModuleOptions,
  EmailModuleAsyncOptions,
} from './interfaces/email-module-options.interface';

// Constants
import {
  EMAIL_SERVICE_TOKEN,
  EMAIL_TRACKING_SERVICE_TOKEN,
  EMAIL_MODULE_OPTIONS_TOKEN,
  EMAIL_TEMPLATE_SERVICE_TOKEN,
  EMAIL_STATS_SERVICE_TOKEN,
} from './constants';
import {EmailTrackingService} from './services/email-tracking.service';
import {OAuth2Service} from './services/oauth2.service';
import {EmailTemplateService} from './services/email-template.service';
import {EmailStatsService} from './services/email-stats.service';
import {EmailStats} from './entities/email-stats.entity';
import {OAuthCredential} from './entities/oauth-credential.entity';
import {EmailTemplateController} from './controllers/email-template.controller';
import {EmailDashboardController} from './controllers/email-dashboard.controller';

@Global()
@Module({})
export class EmailModule {
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
        }),
      ],
      controllers: [
        EmailController,
        EmailTemplateController,
        EmailDashboardController,
        OAuth2Controller,
      ],
      providers: [
        optionsProvider,
        {
          provide: EMAIL_SERVICE_TOKEN,
          useClass: EmailService,
        },
        {
          provide: EMAIL_TRACKING_SERVICE_TOKEN,
          useClass: EmailTrackingService,
        },
        {
          provide: EMAIL_TEMPLATE_SERVICE_TOKEN,
          useClass: EmailTemplateService,
        },
        {
          provide: EMAIL_STATS_SERVICE_TOKEN,
          useClass: EmailStatsService,
        },
        EmailService,
        EmailTrackingService,
        EmailTemplateService,
        EmailStatsService,
        OAuth2Service,
        EmailProcessor,
      ],
      exports: [
        EMAIL_SERVICE_TOKEN,
        EMAIL_TRACKING_SERVICE_TOKEN,
        EMAIL_TEMPLATE_SERVICE_TOKEN,
        EMAIL_STATS_SERVICE_TOKEN,
        EmailService,
        EmailTrackingService,
        EmailTemplateService,
        OAuth2Service,
      ],
    };
  }

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
        BullModule.registerQueueAsync({
          name: 'email',
          useFactory: (configService: ConfigService) => ({
            connection: {
              host: configService.get('REDIS_HOST', 'localhost'),
              port: configService.get('REDIS_PORT', 6379),
              password: configService.get('REDIS_PASSWORD'),
            },
            defaultJobOptions: {
              attempts: 3,
              backoff: {
                type: 'exponential',
                delay: 5000,
              },
              removeOnComplete: true,
              removeOnFail: false,
            },
          }),
          inject: [ConfigService],
        }),
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
        {
          provide: EMAIL_SERVICE_TOKEN,
          useClass: EmailService,
        },
        {
          provide: EMAIL_TRACKING_SERVICE_TOKEN,
          useClass: EmailTrackingService,
        },
        {
          provide: EMAIL_TEMPLATE_SERVICE_TOKEN,
          useClass: EmailTemplateService,
        },
        {
          provide: EMAIL_STATS_SERVICE_TOKEN,
          useClass: EmailStatsService,
        },
        EmailService,
        EmailTrackingService,
        EmailTemplateService,
        EmailStatsService,
        OAuth2Service,
        EmailProcessor,
      ],
      exports: [
        EMAIL_SERVICE_TOKEN,
        EMAIL_TRACKING_SERVICE_TOKEN,
        EMAIL_TEMPLATE_SERVICE_TOKEN,
        EMAIL_STATS_SERVICE_TOKEN,
        EmailService,
        EmailTrackingService,
        EmailTemplateService,
        OAuth2Service,
      ],
    };
  }

  private static createAsyncProviders(
    options: EmailModuleAsyncOptions,
  ): Provider[] {
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

  private static createAsyncOptionsProvider(
    options: EmailModuleAsyncOptions,
  ): Provider {
    if (options.useFactory) {
      return {
        provide: EMAIL_MODULE_OPTIONS_TOKEN,
        useFactory: options.useFactory,
        inject: options.inject || [],
      };
    }

    return {
      provide: EMAIL_MODULE_OPTIONS_TOKEN,
      useFactory: async (optionsFactory: any) =>
        await optionsFactory.createEmailModuleOptions(),
      inject: [options.useExisting || options.useClass!],
    };
  }
}

import { ModuleMetadata, Type } from '@nestjs/common';

/**
 * Main configuration interface for EmailModule
 */
export interface EmailModuleOptions {
  // SMTP Configuration (required)
  smtp: {
    host: string;
    port: number;
    secure?: boolean;
    user: string;
    pass: string;
  };

  // OAuth2 Configuration (optional - for Gmail OAuth2)
  oauth2?: {
    clientId: string;
    clientSecret: string;
    refreshToken: string;
    accessToken?: string;
  };

  // Redis Configuration (optional - uses Upstash by default)
  redis?: {
    url?: string;
    host?: string;
    port?: number;
    password?: string;
    tls?: boolean;
  };

  // Default email settings
  defaults?: {
    from?: string;
    appName?: string;
    appUrl?: string;
  };

  // Features toggle
  features?: {
    tracking?: boolean;
    templates?: boolean;
    queue?: boolean;
  };

  // Include REST API controllers (for standalone mode)
  includeControllers?: boolean;
}

/**
 * Async configuration interface
 */
export interface EmailModuleAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
  useExisting?: Type<EmailModuleOptionsFactory>;
  useClass?: Type<EmailModuleOptionsFactory>;
  useFactory?: (...args: any[]) => Promise<EmailModuleOptions> | EmailModuleOptions;
  inject?: any[];
}

/**
 * Factory interface for async configuration
 */
export interface EmailModuleOptionsFactory {
  createEmailModuleOptions(): Promise<EmailModuleOptions> | EmailModuleOptions;
}

/**
 * Quick configuration helper for common setups
 */
export class EmailConfigBuilder {
  private config: Partial<EmailModuleOptions> = {};

  static create(): EmailConfigBuilder {
    return new EmailConfigBuilder();
  }

  smtp(config: EmailModuleOptions['smtp']): EmailConfigBuilder {
    this.config.smtp = config;
    return this;
  }

  oauth2(config: EmailModuleOptions['oauth2']): EmailConfigBuilder {
    this.config.oauth2 = config;
    return this;
  }

  upstash(url: string): EmailConfigBuilder {
    this.config.redis = { url };
    return this;
  }

  defaults(from: string, appName: string, appUrl: string): EmailConfigBuilder {
    this.config.defaults = { from, appName, appUrl };
    return this;
  }

  withApi(): EmailConfigBuilder {
    this.config.includeControllers = true;
    return this;
  }

  build(): EmailModuleOptions {
    if (!this.config.smtp) {
      throw new Error('SMTP configuration is required');
    }
    return this.config as EmailModuleOptions;
  }
}

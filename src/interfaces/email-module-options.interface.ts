import {ModuleMetadata, Type} from '@nestjs/common';

export interface EmailModuleOptions {
  // SMTP Configuration
  smtp?: {
    host: string;
    port: number;
    secure?: boolean;
    user: string;
    pass: string;
  };

  // OAuth2 Configuration
  oauth2?: {
    clientId: string;
    clientSecret: string;
    refreshToken: string;
    accessToken?: string;
  };

  // Default settings
  defaults?: {
    from: string;
    appName: string;
    appUrl: string;
  };

  // Queue configuration
  queue?: {
    name?: string;
    redis?: {
      host: string;
      port: number;
      password?: string;
    };
  };

  // Template configuration
  templates?: {
    directory?: string;
    autoSync?: boolean;
  };

  // Tracking configuration
  tracking?: {
    enabled?: boolean;
  };
}

export interface EmailModuleAsyncOptions
  extends Pick<ModuleMetadata, 'imports'> {
  useExisting?: Type<EmailModuleOptionsFactory>;
  useClass?: Type<EmailModuleOptionsFactory>;
  useFactory?: (
    ...args: any[]
  ) => Promise<EmailModuleOptions> | EmailModuleOptions;
  inject?: any[];
}

export interface EmailModuleOptionsFactory {
  createEmailModuleOptions(): Promise<EmailModuleOptions> | EmailModuleOptions;
}

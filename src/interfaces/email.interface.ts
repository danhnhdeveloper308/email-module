import {EmailTemplate} from '../entities/email-template.entity';

export interface IEmailService {
  /**
   * Queue an email to be sent
   */
  queueEmail(
    to: string | string[],
    subject: string,
    template: string,
    context: Record<string, any>,
    options?: EmailOptions,
  ): Promise<string>;

  /**
   * Send verification email
   */
  sendVerificationEmail(
    email: string,
    name: string,
    token: string,
  ): Promise<string>;

  /**
   * Send verification code email
   */
  sendVerificationCode(
    email: string,
    name: string,
    code: string,
  ): Promise<string>;

  /**
   * Send password reset email
   */
  sendPasswordResetEmail(
    email: string,
    name: string,
    token: string,
  ): Promise<string>;

  /**
   * Send welcome email
   */
  sendWelcomeEmail(email: string, name: string): Promise<string>;

  /**
   * Send login notification
   */
  sendLoginNotification(
    email: string,
    name: string,
    loginInfo: LoginInfo,
  ): Promise<void>;

  /**
   * Send 2FA backup codes email
   */
  sendTwoFactorBackupCodesEmail(
    email: string,
    name: string,
    backupCodes: string[],
  ): Promise<string>;

  /**
   * Send magic link email
   */
  sendMagicLinkEmail(email: string, name: string, token: string): Promise<void>;

  /**
   * Send bulk emails
   */
  sendBulkEmails(
    recipients: Array<{
      email: string;
      name?: string;
      context?: Record<string, any>;
    }>,
    subject: string,
    template: string,
    context?: Record<string, any>,
    options?: any,
  ): Promise<{batchId: string; queued: number}>;

  /**
   * Get email status
   */
  getEmailStatus(emailId: string): Promise<any>;

  /**
   * Resend email
   */
  resendEmail(emailId: string): Promise<string>;

  /**
   * Get templates
   */
  getTemplates(filters?: {
    isActive?: boolean;
    category?: string;
    search?: string;
  }): Promise<EmailTemplate[]>;

  /**
   * Save template
   */
  saveTemplate(
    name: string,
    content: string,
    data?: {
      subject?: string;
      description?: string;
      isActive?: boolean;
      version?: number;
      lastEditor?: string;
      previewText?: string;
      category?: string;
    },
  ): Promise<EmailTemplate>;
}

export interface EmailOptions {
  from?: string;
  cc?: string | string[];
  bcc?: string | string[];
  attachments?: EmailAttachment[];
  tags?: string[];
  campaignId?: string;
  batchId?: string;
  trackOpens?: boolean;
  trackClicks?: boolean;
  deliveryTime?: Date;
  userId?: string;
  priority?: 'high' | 'normal' | 'low';
  replyTo?: string;
}

export interface EmailAttachment {
  filename: string;
  content: string | Buffer;
  contentType?: string;
  cid?: string;
}

export interface LoginInfo {
  ipAddress?: string;
  userAgent?: string;
  device?: string;
  location?: string;
  time?: Date;
  isNewDevice?: boolean;
}

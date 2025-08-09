import {Injectable, Logger, Inject} from '@nestjs/common';
import {InjectRepository} from '@nestjs/typeorm';
import {Repository} from 'typeorm';
import {InjectQueue} from '@nestjs/bullmq';
import {Queue} from 'bullmq';
import {ConfigService} from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import * as Handlebars from 'handlebars';
import {v4 as uuidv4} from 'uuid';

// Entities
import {EmailLog, EmailStatus} from '../entities/email-log.entity';
import {EmailTemplate} from '../entities/email-template.entity';

// Interfaces
import {
  IEmailService,
  EmailOptions,
  LoginInfo,
} from '../interfaces/email.interface';
import {EmailModuleOptions} from '../interfaces/email-module-options.interface';

// Constants
import {EMAIL_MODULE_OPTIONS_TOKEN} from '../constants';
import {OAuth2Service} from './oauth2.service';

// Services

@Injectable()
export class EmailService implements IEmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;
  private templateCache: Map<string, Handlebars.TemplateDelegate> = new Map();

  constructor(
    @InjectRepository(EmailLog)
    private emailLogRepository: Repository<EmailLog>,
    @InjectRepository(EmailTemplate)
    private emailTemplateRepository: Repository<EmailTemplate>,
    @InjectQueue('email')
    private emailQueue: Queue,
    private configService: ConfigService,
    private oauth2Service: OAuth2Service,
    @Inject(EMAIL_MODULE_OPTIONS_TOKEN)
    private options: EmailModuleOptions,
  ) {
    this.initializeTransporter();
    this.registerHandlebarsHelpers();
  }

  private async initializeTransporter() {
    try {
      const smtpConfig = this.options.smtp;
      const oauth2Config = this.options.oauth2;

      if (oauth2Config && smtpConfig?.host?.includes('gmail')) {
        // Use OAuth2 for Gmail
        const accessToken = await this.oauth2Service.getAccessToken();

        this.transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            type: 'OAuth2',
            user: smtpConfig.user,
            clientId: oauth2Config.clientId,
            clientSecret: oauth2Config.clientSecret,
            refreshToken: oauth2Config.refreshToken,
            accessToken,
          },
        });
      } else if (smtpConfig) {
        // Use regular SMTP
        this.transporter = nodemailer.createTransport({
          host: smtpConfig.host,
          port: smtpConfig.port,
          secure: smtpConfig.secure,
          auth: {
            user: smtpConfig.user,
            pass: smtpConfig.pass,
          },
        });
      } else {
        // Development mode - create test account
        const testAccount = await nodemailer.createTestAccount();

        this.transporter = nodemailer.createTransport({
          host: testAccount.smtp.host,
          port: testAccount.smtp.port,
          secure: testAccount.smtp.secure,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass,
          },
        });

        this.logger.log(`Test account created: ${testAccount.user}`);
      }

      // Verify connection
      await this.transporter.verify();
      this.logger.log('Email transporter initialized successfully');
    } catch (error) {
      this.logger.error(
        `Failed to initialize email transporter: ${error.message}`,
      );
      throw error;
    }
  }

  private registerHandlebarsHelpers() {
    // Register common helpers
    Handlebars.registerHelper('currentYear', () => new Date().getFullYear());

    Handlebars.registerHelper('formatDate', (date: Date, format: string) => {
      if (!date) return '';
      const d = new Date(date);
      switch (format) {
        case 'short':
          return d.toLocaleDateString();
        case 'long':
          return d.toLocaleDateString() + ' ' + d.toLocaleTimeString();
        default:
          return d.toString();
      }
    });

    Handlebars.registerHelper('ifCond', function (v1, operator, v2, options) {
      switch (operator) {
        case '==':
          return v1 == v2 ? options.fn(this) : options.inverse(this);
        case '===':
          return v1 === v2 ? options.fn(this) : options.inverse(this);
        case '!=':
          return v1 != v2 ? options.fn(this) : options.inverse(this);
        default:
          return options.inverse(this);
      }
    });
  }

  async queueEmail(
    to: string | string[],
    subject: string,
    template: string,
    context: Record<string, any>,
    options: EmailOptions = {},
  ): Promise<string> {
    const emailId = uuidv4();
    const recipients = Array.isArray(to) ? to : [to];

    try {
      // Create log entry
      const emailLog = this.emailLogRepository.create({
        emailId,
        to: recipients.join(', '),
        subject,
        template,
        context,
        status: EmailStatus.PENDING,
        campaignId: options.campaignId,
        batchId: options.batchId,
        tags: options.tags,
        userId: options.userId,
      });

      await this.emailLogRepository.save(emailLog);

      // Add to queue
      await this.emailQueue.add(
        'send-email',
        {
          emailId,
          to: recipients,
          subject,
          template,
          context,
          options: {
            ...options,
            from: options.from || this.options.defaults?.from,
          },
        },
        {
          attempts: 3,
          backoff: {type: 'exponential', delay: 5000},
          delay: options.deliveryTime
            ? new Date(options.deliveryTime).getTime() - Date.now()
            : 0,
        },
      );

      this.logger.log(`Email queued: ${emailId}`);
      return emailId;
    } catch (error) {
      this.logger.error(`Failed to queue email: ${error.message}`);
      throw error;
    }
  }

  async sendVerificationEmail(
    email: string,
    name: string,
    token: string,
  ): Promise<string> {
    const verificationLink = `${this.options.defaults?.appUrl}/auth/verify-email/${token}`;

    return this.queueEmail(email, 'Verify Your Email', 'verification', {
      name,
      verificationLink,
      appName: this.options.defaults?.appName,
    });
  }

  async sendVerificationCode(
    email: string,
    name: string,
    code: string,
  ): Promise<string> {
    return this.queueEmail(email, 'Verification Code', 'verification-code', {
      name,
      verificationCode: code,
      appName: this.options.defaults?.appName,
    });
  }

  async sendPasswordResetEmail(
    email: string,
    name: string,
    token: string,
  ): Promise<string> {
    const resetLink = `${this.options.defaults?.appUrl}/reset-password?token=${token}`;

    return this.queueEmail(email, 'Reset Password', 'password-reset', {
      name,
      resetLink,
      appName: this.options.defaults?.appName,
    });
  }

  async sendWelcomeEmail(email: string, name: string): Promise<string> {
    return this.queueEmail(email, 'Welcome!', 'welcome', {
      name,
      appName: this.options.defaults?.appName,
      loginUrl: `${this.options.defaults?.appUrl}/login`,
    });
  }

  async sendLoginNotification(
    email: string,
    name: string,
    loginInfo: LoginInfo,
  ): Promise<void> {
    await this.queueEmail(email, 'New Login Detected', 'login-notification', {
      name,
      loginInfo,
      appName: this.options.defaults?.appName,
    });
  }

  async sendTwoFactorBackupCodesEmail(
    email: string,
    name: string,
    backupCodes: string[],
  ): Promise<string> {
    return this.queueEmail(email, '2FA Backup Codes', '2fa-backup-codes', {
      name,
      backupCodes,
      appName: this.options.defaults?.appName,
    });
  }

  async sendMagicLinkEmail(
    email: string,
    name: string,
    token: string,
  ): Promise<void> {
    const magicLink = `${this.options.defaults?.appUrl}/auth/magic-link/${token}`;

    await this.queueEmail(email, 'Sign In Link', 'magic-link', {
      name,
      magicLink,
      appName: this.options.defaults?.appName,
    });
  }

  async sendBulkEmails(
    recipients: Array<{
      email: string;
      name?: string;
      context?: Record<string, any>;
    }>,
    subject: string,
    template: string,
    context?: Record<string, any>,
    options?: any,
  ): Promise<{batchId: string; queued: number}> {
    const batchId = options?.batchId || uuidv4();
    let queued = 0;

    for (const recipient of recipients) {
      try {
        const mergedContext = {
          ...context,
          ...recipient.context,
          name: recipient.name,
        };

        await this.queueEmail(
          recipient.email,
          subject,
          template,
          mergedContext,
          {
            ...options,
            batchId,
            tags: [...(options?.tags || []), 'bulk'],
          },
        );

        queued++;
      } catch (error) {
        this.logger.error(
          `Failed to queue email for ${recipient.email}: ${error.message}`,
        );
      }
    }

    return {batchId, queued};
  }

  async getEmailStatus(emailId: string): Promise<any> {
    const emailLog = await this.emailLogRepository.findOne({where: {emailId}});
    return emailLog
      ? {
          id: emailLog.emailId,
          status: emailLog.status,
          to: emailLog.to,
          subject: emailLog.subject,
          sentAt: emailLog.sentAt,
          openedAt: emailLog.openedAt,
          clickedAt: emailLog.clickedAt,
        }
      : null;
  }

  async resendEmail(emailId: string): Promise<string> {
    const originalEmail = await this.emailLogRepository.findOne({
      where: {emailId},
    });

    if (!originalEmail) {
      throw new Error(`Email with ID ${emailId} not found`);
    }

    return this.queueEmail(
      originalEmail.to,
      originalEmail.subject,
      originalEmail.template,
      originalEmail.context,
      {tags: ['resend']},
    );
  }

  async getTemplates(filters?: {
    isActive?: boolean;
    category?: string;
    search?: string;
  }): Promise<EmailTemplate[]> {
    const queryBuilder =
      this.emailTemplateRepository.createQueryBuilder('template');

    if (filters?.isActive !== undefined) {
      queryBuilder.andWhere('template.isActive = :isActive', {
        isActive: filters.isActive,
      });
    }

    if (filters?.category) {
      queryBuilder.andWhere('template.category = :category', {
        category: filters.category,
      });
    }

    if (filters?.search) {
      queryBuilder.andWhere(
        '(template.name ILIKE :search OR template.description ILIKE :search)',
        {search: `%${filters.search}%`},
      );
    }

    return queryBuilder.orderBy('template.name', 'ASC').getMany();
  }

  async saveTemplate(
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
  ): Promise<EmailTemplate> {
    // Validate template syntax
    try {
      Handlebars.compile(content);
    } catch (error) {
      throw new Error(`Invalid template syntax: ${error.message}`);
    }

    let template = await this.emailTemplateRepository.findOne({where: {name}});

    if (template) {
      // Update existing
      template.content = content;
      template.subject = data?.subject || template.subject;
      template.description = data?.description || template.description;
      template.isActive =
        data?.isActive !== undefined ? data.isActive : template.isActive;
      template.version = (template.version || 0) + 1;
    } else {
      // Create new
      template = this.emailTemplateRepository.create({
        name,
        content,
        subject: data?.subject,
        description: data?.description,
        isActive: data?.isActive !== undefined ? data.isActive : true,
        version: data?.version || 1,
        category: data?.category || 'general',
      });
    }

    const savedTemplate = await this.emailTemplateRepository.save(template);

    // Update cache
    this.templateCache.set(name, Handlebars.compile(content));

    return savedTemplate;
  }

  // Process queued email (called by processor)
  async processQueuedEmail(data: any): Promise<void> {
    const {emailId, to, subject, template, context, options} = data;

    try {
      // Update status
      await this.emailLogRepository.update(
        {emailId},
        {status: EmailStatus.PROCESSING, attempts: () => '"attempts" + 1'},
      );

      // Compile template
      const html = await this.compileTemplate(template, context);

      // Send email
      const result = await this.transporter.sendMail({
        from: options.from,
        to,
        subject,
        html,
      });

      // Update success
      await this.emailLogRepository.update(
        {emailId},
        {
          status: EmailStatus.SENT,
          messageId: result.messageId,
          sentAt: new Date(),
        },
      );

      this.logger.log(`Email sent: ${emailId}`);
    } catch (error) {
      // Update failure
      await this.emailLogRepository.update(
        {emailId},
        {status: EmailStatus.FAILED, error: error.message},
      );

      throw error;
    }
  }

  private async compileTemplate(
    templateName: string,
    context: Record<string, any>,
  ): Promise<string> {
    if (!this.templateCache.has(templateName)) {
      const templateEntity = await this.emailTemplateRepository.findOne({
        where: {name: templateName, isActive: true},
      });

      if (!templateEntity) {
        throw new Error(`Template "${templateName}" not found`);
      }

      this.templateCache.set(
        templateName,
        Handlebars.compile(templateEntity.content),
      );
    }

    const template = this.templateCache.get(templateName);
    return template({
      ...context,
      appName: this.options.defaults?.appName,
      currentYear: new Date().getFullYear(),
    });
  }
}

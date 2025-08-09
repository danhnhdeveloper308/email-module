import {Injectable, Logger} from '@nestjs/common';
import {InjectRepository} from '@nestjs/typeorm';
import {Repository} from 'typeorm';
import {ConfigService} from '@nestjs/config';
import {EmailLog, EmailStatus} from '../entities/email-log.entity';
import {EmailEvent, EmailEventType} from '../entities/email-event.entity';

@Injectable()
export class EmailTrackingService {
  private readonly logger = new Logger(EmailTrackingService.name);

  constructor(
    @InjectRepository(EmailLog)
    private emailLogRepository: Repository<EmailLog>,
    @InjectRepository(EmailEvent)
    private emailEventRepository: Repository<EmailEvent>,
    private configService: ConfigService,
  ) {}

  /**
   * Track email open event
   */
  async trackOpen(
    emailId: string,
    metadata: Record<string, any> = {},
  ): Promise<void> {
    try {
      // Find email log
      const emailLog = await this.emailLogRepository.findOne({
        where: {emailId},
      });

      if (!emailLog) {
        this.logger.warn(`Email log not found for ID: ${emailId}`);
        return;
      }

      // Update email log
      emailLog.openCount = (emailLog.openCount || 0) + 1;

      // Only update opened status and time if this is the first open
      if (!emailLog.openedAt) {
        emailLog.status = EmailStatus.OPENED;
        emailLog.openedAt = new Date();
      }

      emailLog.lastStatusAt = new Date();
      await this.emailLogRepository.save(emailLog);

      // Create event record
      const event = this.emailEventRepository.create({
        emailId,
        event: EmailEventType.OPENED,
        recipient: emailLog.to,
        timestamp: new Date(),
        metadata,
      });

      await this.emailEventRepository.save(event);

      this.logger.log(`Tracked open for email ${emailId}`);
    } catch (error) {
      this.logger.error(
        `Failed to track email open: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Track email click event
   */
  async trackClick(
    emailId: string,
    url: string,
    metadata: Record<string, any> = {},
  ): Promise<void> {
    try {
      // Find email log
      const emailLog = await this.emailLogRepository.findOne({
        where: {emailId},
      });

      if (!emailLog) {
        this.logger.warn(`Email log not found for ID: ${emailId}`);
        return;
      }

      // Update email log
      emailLog.clickCount = (emailLog.clickCount || 0) + 1;

      // Only update clicked status and time if this is the first click
      if (!emailLog.clickedAt) {
        emailLog.status = EmailStatus.CLICKED;
        emailLog.clickedAt = new Date();
      }

      emailLog.clickUrl = url;
      emailLog.lastStatusAt = new Date();
      await this.emailLogRepository.save(emailLog);

      // Create event record
      const event = this.emailEventRepository.create({
        emailId,
        event: EmailEventType.CLICKED,
        recipient: emailLog.to,
        timestamp: new Date(),
        metadata: {...metadata, url},
      });

      await this.emailEventRepository.save(event);

      this.logger.log(`Tracked click for email ${emailId} on URL ${url}`);
    } catch (error) {
      this.logger.error(
        `Failed to track email click: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Get email tracking statistics
   */
  async getTrackingStats(emailId: string): Promise<any> {
    try {
      const emailLog = await this.emailLogRepository.findOne({
        where: {emailId},
      });

      if (!emailLog) {
        return null;
      }

      const events = await this.emailEventRepository.find({
        where: {emailId},
        order: {timestamp: 'ASC'},
      });

      return {
        email: {
          id: emailLog.emailId,
          status: emailLog.status,
          openCount: emailLog.openCount,
          clickCount: emailLog.clickCount,
          sentAt: emailLog.sentAt,
          openedAt: emailLog.openedAt,
          clickedAt: emailLog.clickedAt,
          clickUrl: emailLog.clickUrl,
        },
        events: events.map(event => ({
          type: event.event,
          timestamp: event.timestamp,
          metadata: event.metadata,
        })),
      };
    } catch (error) {
      this.logger.error(`Failed to get tracking stats: ${error.message}`);
      return null;
    }
  }
}

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EmailService } from '../services/email.service';
import { QueueService } from '../services/queue.service';

@Injectable()
export class EmailProcessor implements OnModuleInit {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(
    private emailService: EmailService,
    private queueService: QueueService,
  ) {}

  async onModuleInit() {
    // ✅ Increase delay to wait for queue service to fully stabilize
    setTimeout(() => {
      this.initializeProcessor();
    }, 5000); // Increased to 5 seconds to allow Redis connection to stabilize
  }

  private initializeProcessor() {
    try {
      this.logger.log('🔧 Initializing email processor...');

      // ✅ Universal processor setup - works with both Redis and Memory queue
      this.queueService.process(async (job: any) => {
        await this.processJob(job);
      });

      this.logger.log('📧 Email processor initialized successfully');
    } catch (error) {
      this.logger.error(`Failed to initialize email processor: ${error.message}`);

      // Retry after delay with exponential backoff
      setTimeout(() => {
        this.logger.log('🔄 Retrying processor initialization...');
        this.initializeProcessor();
      }, 10000); // Increased retry delay
    }
  }

  private async processJob(job: any): Promise<void> {
    this.logger.log(`📧 Processing email job ${job.id} - ${job.name}`);

    try {
      switch (job.name) {
        case 'send-email':
          await this.emailService.processQueuedEmail(job.data);

          // ✅ Notify queue completion (for memory queue compatibility)
          if (typeof this.queueService.jobCompleted === 'function') {
            this.queueService.jobCompleted(job.id);
          }
          break;

        case 'send-bulk-email':
          await this.processBulkEmail(job.data);
          
          if (typeof this.queueService.jobCompleted === 'function') {
            this.queueService.jobCompleted(job.id);
          }
          break;

        default:
          this.logger.warn(`Unknown job type: ${job.name}`);
      }

      this.logger.log(`✅ Email job ${job.id} completed successfully`);
    } catch (error) {
      this.logger.error(
        `❌ Error processing email job ${job.id}: ${error.message}`,
        error.stack,
      );

      // ✅ Notify queue failure (for memory queue compatibility)
      if (typeof this.queueService.jobFailed === 'function') {
        this.queueService.jobFailed(job.id, error);
      }

      throw error;
    }
  }

  private async processBulkEmail(data: any): Promise<void> {
    const { batchId, recipients, subject, template, context } = data;

    this.logger.log(
      `Processing bulk email batch ${batchId} with ${recipients.length} recipients`,
    );

    for (const recipient of recipients) {
      try {
        await this.emailService.queueEmail(
          recipient.email,
          subject,
          template,
          { ...context, ...recipient.context, name: recipient.name },
          { batchId, tags: ['bulk'] },
        );
      } catch (error) {
        this.logger.error(
          `Failed to process bulk email for ${recipient.email}: ${error.message}`,
        );
      }
    }
  }
}

import {Processor, WorkerHost} from '@nestjs/bullmq';
import {Job} from 'bullmq';
import {Logger, Inject} from '@nestjs/common';
import {EmailService} from '../services/email.service';
import {EMAIL_SERVICE_TOKEN} from '../constants';

@Processor('email')
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(
    @Inject(EMAIL_SERVICE_TOKEN)
    private emailService: EmailService,
  ) {
    super();
  }

  async process(job: Job<any>): Promise<void> {
    this.logger.debug(`Processing email job ${job.id}`);

    try {
      switch (job.name) {
        case 'send-email':
          await this.emailService.processQueuedEmail(job.data);
          break;
        case 'send-bulk-email':
          await this.processBulkEmail(job.data);
          break;
        default:
          this.logger.warn(`Unknown job type: ${job.name}`);
      }

      this.logger.debug(`Email job ${job.id} completed successfully`);
    } catch (error) {
      this.logger.error(
        `Error processing email job ${job.id}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  private async processBulkEmail(data: any): Promise<void> {
    const {batchId, recipients, subject, template, context} = data;

    this.logger.log(
      `Processing bulk email batch ${batchId} with ${recipients.length} recipients`,
    );

    for (const recipient of recipients) {
      try {
        await this.emailService.queueEmail(
          recipient.email,
          subject,
          template,
          {...context, ...recipient.context, name: recipient.name},
          {batchId, tags: ['bulk']},
        );
      } catch (error) {
        this.logger.error(
          `Failed to process bulk email for ${recipient.email}: ${error.message}`,
        );
      }
    }
  }
}

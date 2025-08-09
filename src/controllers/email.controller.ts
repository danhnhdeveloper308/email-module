import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  Res,
  HttpStatus,
} from '@nestjs/common';
import {Response} from 'express';
import {ApiTags, ApiOperation, ApiResponse} from '@nestjs/swagger';
import {QueueService} from '../services/queue.service';
import {EmailService} from '../services/email.service';
import {EmailTrackingService} from '../services/email-tracking.service';
import {SendEmailDto} from '../dto/send-email.dto';

@ApiTags('email')
@Controller('email')
export class EmailController {
  constructor(
    private emailService: EmailService,
    private trackingService: EmailTrackingService,
    private queueService: QueueService, // ✅ Use QueueService
  ) {}

  @ApiOperation({summary: 'Health check endpoint'})
  @ApiResponse({status: 200, description: 'Service is healthy'})
  @Get('health')
  async healthCheck() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'email-module',
      version: '1.0.0',
    };
  }

  @ApiOperation({summary: 'Send an email'})
  @ApiResponse({
    status: 200,
    description: 'Email queued successfully',
    schema: {
      type: 'object',
      properties: {
        success: {type: 'boolean'},
        message: {type: 'string'},
        emailId: {type: 'string'},
      },
    },
  })
  @Post('send')
  async sendEmail(@Body() sendEmailDto: SendEmailDto) {
    try {
      const emailId = await this.emailService.queueEmail(
        sendEmailDto.to || 'test@example.com',
        sendEmailDto.subject,
        sendEmailDto.template,
        sendEmailDto.context || {},
        sendEmailDto.options,
      );

      return {
        success: true,
        message: 'Email queued successfully',
        emailId,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiOperation({summary: 'Send a test email'})
  @ApiResponse({status: 200, description: 'Test email sent'})
  @Post('test')
  async sendTestEmail() {
    try {
      const emailId = await this.emailService.queueEmail(
        'test@example.com',
        'Test Email',
        'welcome',
        {name: 'Test User'},
      );

      return {
        success: true,
        message: 'Test email sent successfully',
        emailId,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiOperation({summary: 'Track email open'})
  @Get('track/:emailId/open')
  async trackOpen(@Param('emailId') emailId: string, @Res() res: Response) {
    try {
      await this.trackingService.trackOpen(emailId, {
        userAgent: res.req.headers['user-agent'],
        ipAddress: res.req.ip,
      });
    } catch (error) {
      // Continue even if tracking fails
    }

    // Return 1x1 transparent pixel
    res.setHeader('Content-Type', 'image/gif');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.end(
      Buffer.from(
        'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
        'base64',
      ),
    );
  }

  @ApiOperation({summary: 'Track email click and redirect'})
  @Get('track/:emailId/click')
  async trackClick(
    @Param('emailId') emailId: string,
    @Query('url') url: string,
    @Res() res: Response,
  ) {
    try {
      if (url) {
        await this.trackingService.trackClick(emailId, url, {
          userAgent: res.req.headers['user-agent'],
          ipAddress: res.req.ip,
        });
      }
    } catch (error) {
      // Continue even if tracking fails
    }

    if (url) {
      return res.redirect(url);
    }
    return res.status(400).send('URL parameter required');
  }

  @ApiOperation({summary: 'Get email status'})
  @Get('status/:emailId')
  async getEmailStatus(@Param('emailId') emailId: string) {
    const status = await this.emailService.getEmailStatus(emailId);
    return {success: true, status};
  }

  @ApiOperation({summary: 'Get queue status'})
  @ApiResponse({status: 200, description: 'Queue status retrieved'})
  @Get('queue/status')
  async getQueueStatus() {
    // This would need queue service integration
    return {
      success: true,
      queue: {
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
      },
    };
  }

  @ApiOperation({summary: 'Send bulk emails'})
  @ApiResponse({status: 200, description: 'Bulk emails queued successfully'})
  @Post('bulk')
  async sendBulkEmails(@Body() bulkEmailDto: any) {
    try {
      // Example bulk email structure
      const {recipients, subject, template, context} = bulkEmailDto;

      const result = await this.emailService.sendBulkEmails(
        recipients, // Array of {email, name, context}
        subject,
        template,
        context,
      );

      return {
        success: true,
        message: 'Bulk emails queued successfully',
        batchId: result.batchId,
        queued: result.queued,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiOperation({summary: 'Get detailed queue status from BullMQ'})
  @Get('queue/details')
  async getDetailedQueueStatus() {
    try {
      const queueStats = await this.queueService.getQueueStatus();

      return {
        success: true,
        stats: queueStats,
        queueType: queueStats.type,
        // ✅ Include recovery information
        recovery: queueStats.recovery,
        message:
          queueStats.type === 'memory'
            ? 'Using memory queue - jobs will be recovered when Redis is back'
            : 'Using Redis queue - all systems operational',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  // ✅ New endpoint to get recovery information
  @ApiOperation({summary: 'Get Redis recovery status'})
  @Get('queue/recovery')
  async getRecoveryStatus() {
    try {
      const recoveryInfo = this.queueService.getRecoveryInfo();

      return {
        success: true,
        recovery: recoveryInfo,
        message: recoveryInfo.isRedisAvailable
          ? 'Redis is operational'
          : `Recovery monitoring active - attempt ${recoveryInfo.recoveryAttempts}/10`,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiOperation({summary: 'Retry failed email'})
  @Post('retry/:emailId')
  async retryEmail(@Param('emailId') emailId: string) {
    try {
      const newEmailId = await this.emailService.resendEmail(emailId);
      return {
        success: true,
        message: 'Email retried successfully',
        newEmailId,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }
}

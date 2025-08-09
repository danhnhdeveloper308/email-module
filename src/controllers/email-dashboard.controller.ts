import {Controller, Get, Post, Query} from '@nestjs/common';
import {ApiTags, ApiOperation} from '@nestjs/swagger';
import {EmailStatsService} from '../services/email-stats.service';

@ApiTags('email-dashboard')
@Controller('email-dashboard')
export class EmailDashboardController {
  constructor(private statsService: EmailStatsService) {}

  @ApiOperation({summary: 'Get email statistics for date range'})
  @Get('stats')
  async getStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate
      ? new Date(startDate)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const stats = await this.statsService.getStatsForDateRange(start, end);

    return {
      success: true,
      stats,
      period: {start, end},
    };
  }

  @ApiOperation({summary: 'Generate daily stats'})
  @Post('stats/generate')
  async generateDailyStats(@Query('date') dateStr?: string) {
    try {
      const date = dateStr ? new Date(dateStr) : new Date();
      const stats = await this.statsService.generateDailyStats(date);

      return {
        success: true,
        message: 'Daily stats generated successfully',
        stats,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiOperation({summary: 'Get email performance metrics'})
  @Get('metrics')
  async getMetrics(
    @Query('period') period: string = '7d',
    @Query('template') template?: string,
  ) {
    try {
      const endDate = new Date();
      const startDate = new Date();

      // Calculate start date based on period
      switch (period) {
        case '24h':
          startDate.setHours(startDate.getHours() - 24);
          break;
        case '7d':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(startDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(startDate.getDate() - 90);
          break;
        default:
          startDate.setDate(startDate.getDate() - 7);
      }

      const stats = await this.statsService.getStatsForDateRange(
        startDate,
        endDate,
      );

      // Calculate metrics
      const totalSent = stats.reduce((sum, stat) => sum + stat.sent, 0);
      const totalDelivered = stats.reduce(
        (sum, stat) => sum + stat.delivered,
        0,
      );
      const totalOpened = stats.reduce((sum, stat) => sum + stat.opened, 0);
      const totalClicked = stats.reduce((sum, stat) => sum + stat.clicked, 0);

      return {
        success: true,
        metrics: {
          deliveryRate:
            totalSent > 0 ? ((totalDelivered / totalSent) * 100).toFixed(2) : 0,
          openRate:
            totalDelivered > 0
              ? ((totalOpened / totalDelivered) * 100).toFixed(2)
              : 0,
          clickRate:
            totalOpened > 0
              ? ((totalClicked / totalOpened) * 100).toFixed(2)
              : 0,
          clickToOpenRate:
            totalOpened > 0
              ? ((totalClicked / totalOpened) * 100).toFixed(2)
              : 0,
          totalSent,
          totalDelivered,
          totalOpened,
          totalClicked,
        },
        period: {start: startDate, end: endDate},
        daily_stats: stats,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiOperation({summary: 'Get template performance comparison'})
  @Get('templates/performance')
  async getTemplatePerformance(@Query('days') days: number = 30) {
    // Implementation to compare template performance
    return {
      success: true,
      message: 'Template performance data',
      templates: [], // Will be implemented based on your needs
    };
  }
}

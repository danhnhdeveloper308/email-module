import {Injectable, Logger} from '@nestjs/common';
import {InjectRepository} from '@nestjs/typeorm';
import {Repository, Between} from 'typeorm';
import {EmailLog} from '../entities/email-log.entity';
import {EmailStats} from '../entities/email-stats.entity';

@Injectable()
export class EmailStatsService {
  private readonly logger = new Logger(EmailStatsService.name);

  constructor(
    @InjectRepository(EmailStats)
    private statsRepository: Repository<EmailStats>,
    @InjectRepository(EmailLog)
    private emailLogRepository: Repository<EmailLog>,
  ) {}

  async generateDailyStats(date: Date): Promise<EmailStats> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const stats = await this.emailLogRepository
      .createQueryBuilder('email')
      .select([
        'COUNT(*) as sent',
        "SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as delivered",
        "SUM(CASE WHEN status = 'opened' THEN 1 ELSE 0 END) as opened",
        "SUM(CASE WHEN status = 'clicked' THEN 1 ELSE 0 END) as clicked",
        "SUM(CASE WHEN status = 'bounced' THEN 1 ELSE 0 END) as bounced",
        "SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed",
      ])
      .where('email.createdAt BETWEEN :start AND :end', {
        start: startOfDay,
        end: endOfDay,
      })
      .getRawOne();

    const emailStats = this.statsRepository.create({
      date: startOfDay,
      sent: parseInt(stats.sent) || 0,
      delivered: parseInt(stats.delivered) || 0,
      opened: parseInt(stats.opened) || 0,
      clicked: parseInt(stats.clicked) || 0,
      bounced: parseInt(stats.bounced) || 0,
      failed: parseInt(stats.failed) || 0,
    });

    return await this.statsRepository.save(emailStats);
  }

  async getStatsForDateRange(
    startDate: Date,
    endDate: Date,
  ): Promise<EmailStats[]> {
    return await this.statsRepository.find({
      where: {
        date: Between(startDate, endDate),
      },
      order: {date: 'ASC'},
    });
  }
}

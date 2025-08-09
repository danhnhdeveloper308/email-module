import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export interface QueueJob {
  id: string;
  name: string;
  data: any;
  opts?: any;
  timestamp: number;
  attempts: number;
  failedReason?: string;
}

@Injectable()
export class RedisQueueService {
  private readonly logger = new Logger(RedisQueueService.name);
  private redis: Redis;
  private subscriber: Redis;
  private jobIdCounter = 1;
  private isProcessing = false;

  constructor(private configService: ConfigService) {
    this.initializeRedis();
  }

  private initializeRedis() {
    const redisUrl = this.configService.get('REDIS_URL');
    
    const options = {
      maxRetriesPerRequest: 3,
      retryDelayOnFailover: 100,
      enableReadyCheck: false,
      lazyConnect: true,
      keepAlive: 30000,
      connectTimeout: 10000,
      commandTimeout: 5000,
      family: 4,
    };
    
    if (redisUrl) {
      this.redis = new Redis(redisUrl, options);
      this.subscriber = new Redis(redisUrl, options);
    } else {
      const config = {
        host: this.configService.get('REDIS_HOST', 'localhost'),
        port: parseInt(this.configService.get('REDIS_PORT', '6379')),
        password: this.configService.get('REDIS_PASSWORD') || undefined,
        tls: this.configService.get('REDIS_TLS') === 'true' ? {} : undefined,
        ...options,
      };
      
      this.redis = new Redis(config);
      this.subscriber = new Redis(config);
    }

    this.redis.on('connect', () => {
      this.logger.log('✅ Redis connected successfully');
      this.startProcessing();
    });

    this.redis.on('error', (error) => {
      this.logger.error('❌ Redis connection error:', error.message);
    });
  }

  async add(jobName: string, data: any, opts: any = {}): Promise<QueueJob> {
    const job: QueueJob = {
      id: (this.jobIdCounter++).toString(),
      name: jobName,
      data,
      opts,
      timestamp: Date.now(),
      attempts: 0,
    };

    try {
      if (opts.delay && opts.delay > 0) {
        const delayedUntil = Date.now() + opts.delay;
        await this.redis.zadd('email:delayed', delayedUntil, JSON.stringify(job));
        this.logger.log(`⏰ Job ${job.id} scheduled with ${opts.delay}ms delay`);
      } else {
        await this.redis.lpush('email:waiting', JSON.stringify(job));
        await this.redis.publish('email:job-added', job.id);
        this.logger.log(`➕ Job ${job.id} (${jobName}) added to waiting queue`);
      }

      return job;
    } catch (error) {
      this.logger.error(`Failed to add job: ${error.message}`);
      throw error;
    }
  }

  private startProcessing() {
    if (this.isProcessing) return;
    
    this.isProcessing = true;
    this.logger.log('🚀 Redis Queue processor started');

    setInterval(async () => {
      await this.processDelayedJobs();
    }, 5000);

    this.processWaitingJobs();
  }

  private async processDelayedJobs() {
    try {
      const now = Date.now();
      const delayedJobs = await this.redis.zrangebyscore(
        'email:delayed',
        '-inf',
        now,
        'LIMIT', 0, 10
      );

      for (const jobStr of delayedJobs) {
        const job = JSON.parse(jobStr);
        
        await this.redis.lpush('email:waiting', jobStr);
        await this.redis.zrem('email:delayed', jobStr);
        await this.redis.publish('email:job-added', job.id);
        
        this.logger.log(`⏰ Moved delayed job ${job.id} to waiting queue`);
      }
    } catch (error) {
      this.logger.error(`Error processing delayed jobs: ${error.message}`);
    }
  }

  private async processWaitingJobs() {
    try {
      while (this.isProcessing) {
        const activeCount = await this.redis.llen('email:active');
        if (activeCount >= 3) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }

        const jobStr = await this.redis.brpoplpush(
          'email:waiting',
          'email:active',
          5
        );

        if (jobStr) {
          const job: QueueJob = JSON.parse(jobStr);
          this.processJob(job);
        }
      }
    } catch (error) {
      this.logger.error(`Error in job processing loop: ${error.message}`);
      setTimeout(() => this.processWaitingJobs(), 5000);
    }
  }

  private async processJob(job: QueueJob) {
    this.logger.log(`🔄 Processing job ${job.id} (${job.name})`);

    try {
      await this.redis.publish('email:process', JSON.stringify(job));
      await this.waitForJobCompletion(job.id);
      await this.moveJobToCompleted(job);
      
      this.logger.log(`✅ Job ${job.id} completed successfully`);
    } catch (error) {
      this.logger.error(`❌ Job ${job.id} failed: ${error.message}`);
      await this.handleJobFailure(job, error);
    }
  }

  private async waitForJobCompletion(jobId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.subscriber.unsubscribe(`email:job:${jobId}:completed`);
        this.subscriber.unsubscribe(`email:job:${jobId}:failed`);
        reject(new Error('Job timeout'));
      }, 30000);

      this.subscriber.subscribe(`email:job:${jobId}:completed`);
      this.subscriber.subscribe(`email:job:${jobId}:failed`);

      this.subscriber.on('message', (channel, message) => {
        if (channel === `email:job:${jobId}:completed`) {
          clearTimeout(timeout);
          this.subscriber.unsubscribe(`email:job:${jobId}:completed`);
          this.subscriber.unsubscribe(`email:job:${jobId}:failed`);
          resolve();
        } else if (channel === `email:job:${jobId}:failed`) {
          clearTimeout(timeout);
          this.subscriber.unsubscribe(`email:job:${jobId}:completed`);
          this.subscriber.unsubscribe(`email:job:${jobId}:failed`);
          reject(new Error(message));
        }
      });
    });
  }

  private async moveJobToCompleted(job: QueueJob) {
    const jobStr = JSON.stringify(job);
    
    await this.redis.lrem('email:active', 1, jobStr);
    await this.redis.lpush('email:completed', jobStr);
    await this.redis.ltrim('email:completed', 0, 99);
  }

  private async handleJobFailure(job: QueueJob, error: any) {
    job.attempts++;
    job.failedReason = error.message;

    const maxAttempts = job.opts?.attempts || 3;
    const jobStr = JSON.stringify(job);

    await this.redis.lrem('email:active', 1, JSON.stringify({...job, attempts: job.attempts - 1}));

    if (job.attempts < maxAttempts) {
      const delay = Math.min(1000 * Math.pow(2, job.attempts), 30000);
      const retryTime = Date.now() + delay;
      
      await this.redis.zadd('email:delayed', retryTime, jobStr);
      this.logger.log(`🔄 Job ${job.id} will retry in ${delay}ms (attempt ${job.attempts}/${maxAttempts})`);
    } else {
      await this.redis.lpush('email:failed', jobStr);
      await this.redis.ltrim('email:failed', 0, 49);
      this.logger.error(`💀 Job ${job.id} failed permanently after ${job.attempts} attempts`);
    }
  }

  async jobCompleted(jobId: string) {
    await this.redis.publish(`email:job:${jobId}:completed`, 'success');
  }

  async jobFailed(jobId: string, error: Error) {
    await this.redis.publish(`email:job:${jobId}:failed`, error.message);
  }

  async getWaiting(): Promise<QueueJob[]> {
    const jobs = await this.redis.lrange('email:waiting', 0, -1);
    return jobs.map(job => JSON.parse(job));
  }

  async getActive(): Promise<QueueJob[]> {
    const jobs = await this.redis.lrange('email:active', 0, -1);
    return jobs.map(job => JSON.parse(job));
  }

  async getCompleted(): Promise<QueueJob[]> {
    const jobs = await this.redis.lrange('email:completed', 0, -1);
    return jobs.map(job => JSON.parse(job));
  }

  async getFailed(): Promise<QueueJob[]> {
    const jobs = await this.redis.lrange('email:failed', 0, -1);
    return jobs.map(job => JSON.parse(job));
  }

  async getDelayed(): Promise<QueueJob[]> {
    const jobs = await this.redis.zrange('email:delayed', 0, -1);
    return jobs.map(job => JSON.parse(job));
  }

  subscribeToProcessEvents(callback: (job: QueueJob) => void) {
    const subscriber = new Redis(this.redis.options);
    subscriber.subscribe('email:process');
    
    subscriber.on('message', (channel, message) => {
      if (channel === 'email:process') {
        const job = JSON.parse(message);
        callback(job);
      }
    });
  }

  async onModuleDestroy() {
    this.isProcessing = false;
    await this.redis.disconnect();
    await this.subscriber.disconnect();
    this.logger.log('🔌 Redis Queue service disconnected');
  }
}

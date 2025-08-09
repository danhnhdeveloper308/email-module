import { Injectable, Logger, Inject, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MemoryQueueService } from './memory-queue.service';
import { EMAIL_MODULE_OPTIONS_TOKEN } from '../constants';
import { EmailModuleOptions } from '../interfaces/email-module-options.interface';

export interface QueueAdapter {
  add(jobName: string, data: any, opts?: any): Promise<any>;
  getWaiting(): Promise<any[]>;
  getActive(): Promise<any[]>;
  getCompleted(): Promise<any[]>;
  getFailed(): Promise<any[]>;
  getDelayed(): Promise<any[]>;
  jobCompleted?(jobId: string): void | Promise<void>;
  jobFailed?(jobId: string, error: Error): void | Promise<void>;
  subscribeToProcessEvents?(callback: (job: any) => void): void;
  on?(event: string, callback: Function): void; // Add EventEmitter support
}

@Injectable()
export class QueueAdapterService implements OnModuleInit {
  private readonly logger = new Logger(QueueAdapterService.name);
  private adapter: QueueAdapter;

  constructor(
    private configService: ConfigService,
    private memoryQueue: MemoryQueueService,
    @Inject(EMAIL_MODULE_OPTIONS_TOKEN)
    private options: EmailModuleOptions,
  ) {
    // Initialize with memory queue as default
    this.adapter = this.memoryQueue;
    this.logger.log('💾 Default Memory Queue adapter initialized');
  }

  async onModuleInit() {
    // Try to initialize Redis adapter during module initialization
    await this.initializeAdapter();
  }

  private async initializeAdapter(): Promise<void> {
    const redisHost = this.configService.get('REDIS_HOST');
    const redisPort = this.configService.get('REDIS_PORT');
    
    if (redisHost && redisPort && await this.isRedisAvailable()) {
      await this.initializeBullMQAdapter();
    } else {
      // Already initialized with memory queue in constructor
      this.logger.log('⚠️  Redis not available - using memory queue');
    }
  }

  private async isRedisAvailable(): Promise<boolean> {
    try {
      const Redis = require('ioredis');
      
      // ✅ Parse Redis URL properly for Upstash
      const redisUrl = this.configService.get('REDIS_URL') || this.configService.get('UPSTASH_REDIS_URL');
      
      if (!redisUrl) {
        return false;
      }

      let redisConfig;
      
      if (redisUrl.startsWith('redis://') || redisUrl.startsWith('rediss://')) {
        // Parse URL for Upstash
        const url = new URL(redisUrl);
        redisConfig = {
          host: url.hostname,
          port: parseInt(url.port) || 6379,
          password: url.password,
          username: url.username || 'default',
          tls: url.protocol === 'rediss:' ? {} : undefined,
          maxRetriesPerRequest: 1,
          connectTimeout: 5000,
          lazyConnect: true,
          retryDelayOnFailover: 100,
        };
      } else {
        // Fallback to individual config
        redisConfig = {
          host: this.configService.get('REDIS_HOST', 'localhost'),
          port: parseInt(this.configService.get('REDIS_PORT', '6379')),
          password: this.configService.get('REDIS_PASSWORD'),
          maxRetriesPerRequest: 1,
          connectTimeout: 5000,
          lazyConnect: true,
        };
      }

      const redis = new Redis(redisConfig);
      
      // Test connection with timeout
      const connectPromise = redis.ping();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Connection timeout')), 3000)
      );
      
      await Promise.race([connectPromise, timeoutPromise]);
      await redis.quit();
      
      this.logger.log('✅ Redis available - using BullMQ');
      return true;
    } catch (error) {
      this.logger.warn(`⚠️  Redis not available: ${error.message} - using memory queue`);
      return false;
    }
  }

  private async initializeBullMQAdapter(): Promise<void> {
    try {
      const { Queue } = await import('bullmq');
      
      // ✅ Use same parsing logic for BullMQ
      const redisUrl = this.configService.get('REDIS_URL') || this.configService.get('UPSTASH_REDIS_URL');
      
      let connectionConfig;
      
      if (redisUrl && (redisUrl.startsWith('redis://') || redisUrl.startsWith('rediss://'))) {
        const url = new URL(redisUrl);
        connectionConfig = {
          host: url.hostname,
          port: parseInt(url.port) || 6379,
          password: url.password,
          username: url.username || 'default',
          tls: url.protocol === 'rediss:' ? {} : undefined,
        };
      } else {
        connectionConfig = {
          host: this.configService.get('REDIS_HOST', 'localhost'),
          port: parseInt(this.configService.get('REDIS_PORT', '6379')),
          password: this.configService.get('REDIS_PASSWORD'),
        };
      }
      
      const bullQueue = new Queue('email', {
        connection: connectionConfig,
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
          removeOnComplete: true,
          removeOnFail: false,
        },
      });

      this.adapter = bullQueue;
      this.logger.log('🚀 BullMQ adapter initialized');
      
    } catch (error) {
      this.logger.error(`Failed to initialize BullMQ: ${error.message}`);
      // Keep memory queue as fallback
      this.logger.log('💾 Fallback Memory Queue adapter maintained');
    }
  }

  getAdapter(): QueueAdapter {
    return this.adapter;
  }

  async add(jobName: string, data: any, opts?: any): Promise<any> {
    return this.adapter.add(jobName, data, opts);
  }

  async getWaiting(): Promise<any[]> {
    return this.adapter.getWaiting();
  }

  async getActive(): Promise<any[]> {
    return this.adapter.getActive();
  }

  async getCompleted(): Promise<any[]> {
    return this.adapter.getCompleted();
  }

  async getFailed(): Promise<any[]> {
    return this.adapter.getFailed();
  }

  async getDelayed(): Promise<any[]> {
    return this.adapter.getDelayed();
  }

  onProcess(callback: (job: any) => void): void {
    if (!this.adapter) {
      this.logger.error('❌ Queue adapter not initialized');
      return;
    }

    if (this.adapter.subscribeToProcessEvents) {
      this.adapter.subscribeToProcessEvents(callback);
    } else if (this.adapter.on) {
      // Fallback for memory queue using EventEmitter pattern
      this.adapter.on('process', callback);
    } else {
      this.logger.error('❌ Queue adapter does not support process events');
    }
  }

  jobCompleted(jobId: string): void {
    if (this.adapter && this.adapter.jobCompleted) {
      this.adapter.jobCompleted(jobId);
    }
  }

  jobFailed(jobId: string, error: Error): void {
    if (this.adapter && this.adapter.jobFailed) {
      this.adapter.jobFailed(jobId, error);
    }
  }
}

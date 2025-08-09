import { Injectable, Logger, Inject, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EMAIL_MODULE_OPTIONS_TOKEN } from '../constants';
import { EmailModuleOptions } from '../interfaces/email-module-options.interface';
import { MemoryQueueService } from './memory-queue.service';
import { QueueJob, QueueStats, QueueRecoveryInfo } from '../interfaces/queue-job.interface';

@Injectable()
export class QueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(QueueService.name);
  private queue: any;
  private worker: any;
  private isRedisAvailable = false;
  private processor: ((job: QueueJob) => Promise<void>) | null = null;
  
  // ✅ Recovery mechanism properties
  private recoveryInterval?: NodeJS.Timeout;
  private recoveryInfo: QueueRecoveryInfo = {
    isRedisAvailable: false,
    lastRedisCheck: new Date(),
    pendingRecovery: false,
    recoveryAttempts: 0,
  };
  private readonly RECOVERY_CHECK_INTERVAL = 30000; // 30 seconds
  private readonly MAX_RECOVERY_ATTEMPTS = 10;

  constructor(
    private configService: ConfigService,
    private memoryQueueService: MemoryQueueService,
    @Inject(EMAIL_MODULE_OPTIONS_TOKEN)
    private options: EmailModuleOptions,
  ) {}

  async onModuleInit() {
    await this.initializeQueue();
    this.startRecoveryMonitoring();
  }

  async onModuleDestroy() {
    if (this.recoveryInterval) {
      clearInterval(this.recoveryInterval);
    }
    if (this.worker) {
      await this.worker.close();
    }
    if (this.queue && typeof this.queue.close === 'function') {
      await this.queue.close();
    }
  }

  // ✅ Start recovery monitoring
  private startRecoveryMonitoring(): void {
    this.recoveryInterval = setInterval(async () => {
      await this.checkRedisRecovery();
    }, this.RECOVERY_CHECK_INTERVAL);
    
    this.logger.log('🔄 Redis recovery monitoring started');
  }

  // ✅ Check if Redis has recovered
  private async checkRedisRecovery(): Promise<void> {
    // Only check if currently using memory queue
    if (this.isRedisAvailable || this.recoveryInfo.pendingRecovery) {
      return;
    }

    this.recoveryInfo.lastRedisCheck = new Date();
    
    try {
      const redisUrl = this.configService.get('REDIS_URL') || 
                       this.configService.get('UPSTASH_REDIS_URL') ||
                       this.options.redis?.url;

      if (!redisUrl) {
        return;
      }

      // Test Redis connection
      const isRedisBack = await this.testRedisConnection(redisUrl);
      
      if (isRedisBack && this.recoveryInfo.recoveryAttempts < this.MAX_RECOVERY_ATTEMPTS) {
        this.logger.log('🔄 Redis is back online! Starting recovery process...');
        await this.performRecovery(redisUrl);
      }
    } catch (error) {
      this.logger.debug(`Redis recovery check failed: ${error.message}`);
    }
  }

  // ✅ Test Redis connection
  private async testRedisConnection(redisUrl: string): Promise<boolean> {
    try {
      const Redis = require('ioredis');
      const connectionConfig = this.parseRedisUrl(redisUrl);
      
      const redis = new Redis({
        ...connectionConfig,
        connectTimeout: 5000,
        commandTimeout: 3000,
        maxRetriesPerRequest: 1,
        lazyConnect: true,
      });

      await Promise.race([
        redis.ping(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Connection timeout')), 4000)
        )
      ]);

      await redis.disconnect();
      return true;
    } catch (error) {
      return false;
    }
  }

  // ✅ Perform recovery from memory to Redis
  private async performRecovery(redisUrl: string): Promise<void> {
    if (this.recoveryInfo.pendingRecovery) {
      return; // Recovery already in progress
    }

    this.recoveryInfo.pendingRecovery = true;
    this.recoveryInfo.recoveryAttempts++;

    try {
      this.logger.log(`🔄 Recovery attempt ${this.recoveryInfo.recoveryAttempts}/${this.MAX_RECOVERY_ATTEMPTS}`);

      // Step 1: Get all pending jobs from memory queue
      const [waitingJobs, activeJobs, delayedJobs] = await Promise.all([
        this.memoryQueueService.getWaiting(),
        this.memoryQueueService.getActive(),
        this.memoryQueueService.getDelayed(),
      ]);

      const totalJobs = waitingJobs.length + activeJobs.length + delayedJobs.length;
      
      if (totalJobs === 0) {
        this.logger.log('🔄 No jobs to recover from memory queue');
        // Still switch to Redis for future jobs
        await this.switchToRedis(redisUrl);
        return;
      }

      this.logger.log(`🔄 Found ${totalJobs} jobs to recover (waiting: ${waitingJobs.length}, active: ${activeJobs.length}, delayed: ${delayedJobs.length})`);

      // Step 2: Initialize Redis queue
      await this.initializeRedisQueue(redisUrl);

      // Step 3: Transfer jobs to Redis
      let recoveredCount = 0;

      // Transfer waiting jobs
      for (const job of waitingJobs) {
        try {
          await this.queue.add(job.name, job.data, {
            ...job.opts,
            attempts: job.opts?.attempts || 3,
            delay: 0, // Process immediately
            jobId: job.id, // Preserve original job ID if possible
          });
          recoveredCount++;
        } catch (error) {
          this.logger.warn(`Failed to recover waiting job ${job.id}: ${error.message}`);
        }
      }

      // Transfer active jobs (retry them)
      for (const job of activeJobs) {
        try {
          await this.queue.add(job.name, job.data, {
            ...job.opts,
            attempts: Math.max((job.opts?.attempts || 3) - job.attempts, 1),
            delay: 1000, // Small delay before retry
            jobId: `${job.id}-recovered`,
          });
          recoveredCount++;
        } catch (error) {
          this.logger.warn(`Failed to recover active job ${job.id}: ${error.message}`);
        }
      }

      // Transfer delayed jobs
      for (const job of delayedJobs) {
        try {
          const remainingDelay = Math.max(
            (job.timestamp + (job.opts?.delay || 0)) - Date.now(),
            0
          );
          
          await this.queue.add(job.name, job.data, {
            ...job.opts,
            attempts: job.opts?.attempts || 3,
            delay: remainingDelay,
            jobId: `${job.id}-delayed`,
          });
          recoveredCount++;
        } catch (error) {
          this.logger.warn(`Failed to recover delayed job ${job.id}: ${error.message}`);
        }
      }

      // Step 4: Switch to Redis
      this.isRedisAvailable = true;
      this.recoveryInfo.isRedisAvailable = true;

      // Step 5: Re-setup processor for Redis
      if (this.processor) {
        this.logger.log('🔄 Re-setting up processor for Redis queue');
        // Redis processing is handled by Worker already
      }

      this.logger.log(`✅ Recovery completed! Transferred ${recoveredCount}/${totalJobs} jobs to Redis`);
      this.logger.log('🚀 Now using Redis queue for all new jobs');

    } catch (error) {
      this.logger.error(`❌ Recovery failed: ${error.message}`);
      
      // Reset Redis availability
      this.isRedisAvailable = false;
      this.recoveryInfo.isRedisAvailable = false;
      
      // Clean up failed Redis connections
      if (this.worker) {
        await this.worker.close();
        this.worker = null;
      }
      if (this.queue && typeof this.queue.close === 'function') {
        await this.queue.close();
        this.queue = null;
      }

      // Continue using memory queue
      this.logger.log('💾 Continuing with memory queue after failed recovery');

    } finally {
      this.recoveryInfo.pendingRecovery = false;
    }
  }

  // ✅ Switch to Redis after successful recovery
  private async switchToRedis(redisUrl: string): Promise<void> {
    try {
      await this.initializeRedisQueue(redisUrl);
      this.isRedisAvailable = true;
      this.recoveryInfo.isRedisAvailable = true;
      
      this.logger.log('✅ Successfully switched to Redis queue');
    } catch (error) {
      this.logger.error(`Failed to switch to Redis: ${error.message}`);
      throw error;
    }
  }

  // ✅ Enhanced add method with recovery awareness
  async add(jobName: string, data: any, opts: any = {}): Promise<any> {
    try {
      if (this.isRedisAvailable && this.queue) {
        // Use BullMQ for Redis with timeout protection
        return await Promise.race([
          this.queue.add(jobName, data, opts),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Add job timeout')), 3000)
          )
        ]);
      } else {
        // Use MemoryQueueService
        const result = await this.memoryQueueService.add(jobName, data, opts);
        
        // ✅ Log for recovery tracking
        this.logger.debug(`Job ${result.id} added to memory queue (will be recovered when Redis is back)`);
        
        return result;
      }
    } catch (error) {
      if (this.isRedisAvailable) {
        this.logger.warn(`Redis job failed, using memory queue: ${error.message}`);
        // Don't immediately mark Redis as unavailable, let recovery monitor handle it
        return await this.memoryQueueService.add(jobName, data, opts);
      }
      throw error;
    }
  }

  // ✅ Add missing process method
  process(processor: (job: QueueJob) => Promise<void>) {
    this.processor = processor;
    
    if (this.isRedisAvailable && this.worker) {
      // Redis processing is handled by Worker - already set up in initializeRedisQueue
      this.logger.log('📧 Redis worker processing enabled');
    } else {
      // Setup memory queue processing
      this.memoryQueueService.on('process', async (job: any) => {
        if (this.processor) {
          try {
            await this.processor(job);
          } catch (error) {
            this.logger.error(`Memory queue job processing failed: ${error.message}`);
            throw error;
          }
        }
      });
      this.logger.log('📧 Memory queue processing enabled');
    }
  }

  // ✅ Add missing getRecoveryInfo method
  getRecoveryInfo(): QueueRecoveryInfo {
    return {
      ...this.recoveryInfo,
      lastRedisCheck: new Date(this.recoveryInfo.lastRedisCheck),
    };
  }

  // ✅ Add missing jobCompleted method
  jobCompleted(jobId: string): void {
    if (!this.isRedisAvailable) {
      this.memoryQueueService.jobCompleted(jobId);
    }
  }

  // ✅ Add missing jobFailed method
  jobFailed(jobId: string, error: Error): void {
    if (!this.isRedisAvailable) {
      this.memoryQueueService.jobFailed(jobId, error);
    }
  }

  // ✅ Enhanced queue status with recovery info
  async getQueueStatus(): Promise<QueueStats & { recovery?: QueueRecoveryInfo }> {
    try {
      let stats: QueueStats;
      
      if (this.isRedisAvailable && this.queue) {
        const [waiting, active, completed, failed] = await Promise.all([
          this.queue.getWaiting().then((jobs: any[]) => jobs.length).catch(() => 0),
          this.queue.getActive().then((jobs: any[]) => jobs.length).catch(() => 0), 
          this.queue.getCompleted().then((jobs: any[]) => jobs.length).catch(() => 0),
          this.queue.getFailed().then((jobs: any[]) => jobs.length).catch(() => 0),
        ]);

        stats = {
          waiting,
          active, 
          completed,
          failed,
          type: 'redis',
          url: this.configService.get('REDIS_URL') || this.configService.get('UPSTASH_REDIS_URL'),
        };
      } else {
        // Memory queue status
        const [waiting, active, completed, failed] = await Promise.all([
          this.memoryQueueService.getWaiting(),
          this.memoryQueueService.getActive(),
          this.memoryQueueService.getCompleted(), 
          this.memoryQueueService.getFailed(),
        ]);

        stats = {
          waiting: waiting.length,
          active: active.length,
          completed: completed.length,
          failed: failed.length,
          type: 'memory',
        };
      }

      return {
        ...stats,
        recovery: this.getRecoveryInfo(),
      };
    } catch (error) {
      this.logger.error(`Failed to get queue status: ${error.message}`);
      return {
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        type: 'unknown',
        error: error.message,
        recovery: this.getRecoveryInfo(),
      };
    }
  }

  // ✅ Delegate methods to appropriate queue implementation
  async getWaiting(): Promise<QueueJob[]> {
    if (this.isRedisAvailable) {
      return this.queue?.getWaiting() || [];
    } else {
      return this.memoryQueueService.getWaiting();
    }
  }

  async getActive(): Promise<QueueJob[]> {
    if (this.isRedisAvailable) {
      return this.queue?.getActive() || [];
    } else {
      return this.memoryQueueService.getActive();
    }
  }

  async getCompleted(): Promise<QueueJob[]> {
    if (this.isRedisAvailable) {
      return this.queue?.getCompleted() || [];
    } else {
      return this.memoryQueueService.getCompleted();
    }
  }

  async getFailed(): Promise<QueueJob[]> {
    if (this.isRedisAvailable) {
      return this.queue?.getFailed() || [];
    } else {
      return this.memoryQueueService.getFailed();
    }
  }

  async getDelayed(): Promise<QueueJob[]> {
    if (this.isRedisAvailable) {
      return this.queue?.getDelayed ? this.queue.getDelayed() : [];
    } else {
      return this.memoryQueueService.getDelayed();
    }
  }

  private async initializeQueue() {
    const redisUrl = this.configService.get('REDIS_URL') || 
                     this.configService.get('UPSTASH_REDIS_URL') ||
                     this.options.redis?.url;

    if (redisUrl) {
      try {
        this.logger.log('🔄 Attempting to connect to Upstash Redis...');
        await this.initializeRedisQueue(redisUrl);
        this.isRedisAvailable = true;
        this.logger.log('🚀 BullMQ queue initialized with Upstash Redis');
      } catch (error) {
        this.logger.warn(`Failed to initialize Redis queue: ${error.message}`);
        this.logger.log('🔄 Falling back to Memory Queue...');
        this.initializeMemoryQueue();
      }
    } else {
      this.logger.log('⚠️  No Redis URL provided, using Memory Queue');
      this.initializeMemoryQueue();
    }
  }

  // ✅ Add missing initializeRedisQueue method
  private async initializeRedisQueue(redisUrl: string) {
    const { Queue, Worker } = await import('bullmq');
    
    // ✅ Optimized Redis connection for Upstash with better stability
    const connectionConfig = this.parseRedisUrl(redisUrl);
    
    try {
      this.queue = new Queue('email', {
        connection: {
          ...connectionConfig,
          // ✅ Upstash-specific optimizations
          maxRetriesPerRequest: null, // Required for BullMQ
          retryDelayOnFailover: 100,
          enableReadyCheck: false,
          lazyConnect: true,
          
          // ✅ Increased timeouts for Upstash stability
          connectTimeout: 30000,     // 30 seconds
          commandTimeout: 20000,     // 20 seconds
          
          // ✅ Connection pool optimizations
          family: 4,
          keepAlive: 30000, // ✅ Fixed: number (30 seconds) instead of boolean
          
          // ✅ Disable problematic features for Upstash
          db: 0,
          showFriendlyErrorStack: process.env.NODE_ENV === 'development',
          
          // ✅ Add reconnection logic
          reconnectOnError: (err) => {
            const targetError = 'READONLY';
            if (err.message.includes(targetError)) {
              return true;
            }
            return false;
          },
          
          // ✅ Add retry configuration
          retryDelayOnClusterDown: 300,
        },
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
          removeOnComplete: 100,
          removeOnFail: 50,
        },
      });

      // ✅ Test queue connection with longer timeout
      await Promise.race([
        this.queue.waitUntilReady(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Queue connection timeout')), 20000)
        )
      ]);

      this.logger.log('✅ Queue connection established');

      // ✅ Create worker with reduced concurrency for stability
      this.worker = new Worker('email', async (bullJob) => {
        if (this.processor) {
          const queueJob: QueueJob = {
            id: bullJob.id?.toString() || 'unknown',
            name: bullJob.name,
            data: bullJob.data,
            opts: bullJob.opts,
            timestamp: bullJob.timestamp || Date.now(),
            attempts: bullJob.attemptsMade || 0,
            failedReason: bullJob.failedReason || undefined,
          };
          
          await this.processor(queueJob);
        }
      }, {
        connection: {
          ...connectionConfig,
          // ✅ Worker-specific optimizations for Upstash
          maxRetriesPerRequest: null,
          retryDelayOnFailover: 200,
          connectTimeout: 30000,
          commandTimeout: 20000,
          enableReadyCheck: false,
          lazyConnect: true,
          keepAlive: 30000, // ✅ Fixed: number instead of boolean
        },
        concurrency: 1, // ✅ Single job processing for stability
        
        // ✅ Increased timeouts for job processing
        maxStalledCount: 1,
        stalledInterval: 60 * 1000, // 60 seconds
        
        // ✅ Add job processing settings
        removeOnComplete: { count: 100, age: 24 * 3600 },
        removeOnFail: { count: 50, age: 24 * 3600 },
      });

      // ✅ Enhanced error handling with specific timeout error detection
      this.worker.on('completed', (job: any) => {
        this.logger.log(`✅ Redis job ${job.id} completed`);
      });

      this.worker.on('failed', (job: any, err: any) => {
        this.logger.error(`❌ Redis job ${job?.id} failed: ${err.message}`);
      });

      this.worker.on('error', (error: any) => {
        this.logger.error(`❌ Worker error: ${error.message}`);
        
        // ✅ Better error categorization
        const errorMsg = error.message.toLowerCase();
        if (errorMsg.includes('timeout') || 
            errorMsg.includes('econnreset') || 
            errorMsg.includes('command timed out') ||
            errorMsg.includes('connection closed') ||
            errorMsg.includes('read timeout')) {
          this.handleConnectionError(error);
        }
      });

      // ✅ Handle connection events
      this.worker.on('ready', () => {
        this.logger.log('🚀 BullMQ Worker is ready');
        // Reset connection error counter on successful connection
        this.connectionErrorCount = 0;
      });

      this.worker.on('stalled', (jobId: string) => {
        this.logger.warn(`⏰ Job ${jobId} stalled, will be retried`);
      });

      // ✅ Wait for worker ready with longer timeout
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Worker ready timeout'));
        }, 15000); // 15 seconds

        this.worker.once('ready', () => {
          clearTimeout(timeout);
          resolve(true);
        });

        this.worker.once('error', (error: any) => {
          clearTimeout(timeout);
          reject(error);
        });
      });

      this.logger.log('✅ BullMQ Worker initialized and ready');

    } catch (error) {
      this.logger.error(`Failed to initialize Redis worker: ${error.message}`);
      throw error;
    }
  }

  private parseRedisUrl(url: string) {
    try {
      const redisUrl = new URL(url);
      
      const config = {
        host: redisUrl.hostname,
        port: parseInt(redisUrl.port) || (redisUrl.protocol === 'rediss:' ? 6380 : 6379),
        password: redisUrl.password || undefined,
        username: redisUrl.username || 'default',
        
        // ✅ Enhanced TLS configuration for Upstash
        tls: redisUrl.protocol === 'rediss:' ? {
          rejectUnauthorized: false,
          servername: redisUrl.hostname,
          // ✅ Add additional TLS options
          checkServerIdentity: () => undefined,
          minVersion: 'TLSv1.2',
        } : undefined,
      };

      this.logger.debug(`Redis config for Upstash: ${JSON.stringify({
        host: config.host,
        port: config.port,
        username: config.username,
        tls: !!config.tls,
        protocol: redisUrl.protocol
      })}`);

      return config;
    } catch (error) {
      this.logger.warn(`Failed to parse Redis URL: ${error.message}`);
      throw error;
    }
  }

  // ✅ Add missing initializeMemoryQueue method
  private initializeMemoryQueue() {
    // ✅ Use injected MemoryQueueService as fallback
    this.queue = this.memoryQueueService;
    this.isRedisAvailable = false;
    this.logger.log('💾 Memory queue initialized (fallback mode)');
  }

  // ✅ Enhanced connection error handling
  private connectionErrorCount = 0;
  private readonly MAX_CONNECTION_ERRORS = 3; // Reduced threshold

  private handleConnectionError(error: any): void {
    this.connectionErrorCount++;
    
    this.logger.warn(`Redis connection error ${this.connectionErrorCount}/${this.MAX_CONNECTION_ERRORS}: ${error.message}`);
    
    if (this.connectionErrorCount >= this.MAX_CONNECTION_ERRORS) {
      this.logger.warn('🔄 Too many Redis connection errors, falling back to memory queue...');
      setTimeout(() => {
        this.fallbackToMemoryQueue();
      }, 2000); // Small delay before fallback
    }
  }

  // ✅ Enhanced fallback method
  private async fallbackToMemoryQueue(): Promise<void> {
    try {
      this.logger.log('🔄 Initiating fallback to memory queue...');
      
      // Close existing Redis connections gracefully
      if (this.worker) {
        await this.worker.close();
        this.worker = null;
        this.logger.log('Worker closed');
      }
      if (this.queue && typeof this.queue.close === 'function') {
        await this.queue.close();
        this.logger.log('Queue closed');
      }

      // Switch to memory queue
      this.initializeMemoryQueue();
      this.isRedisAvailable = false;

      // Reset error counter
      this.connectionErrorCount = 0;

      // Re-setup processor for memory queue
      if (this.processor) {
        this.memoryQueueService.on('process', async (job: any) => {
          if (this.processor) {
            try {
              await this.processor(job);
            } catch (error) {
              this.logger.error(`Memory queue job processing failed: ${error.message}`);
              throw error;
            }
          }
        });
        this.logger.log('📧 Memory queue processing re-enabled after fallback');
      }

      this.logger.log('💾 Successfully switched to memory queue fallback');
    } catch (error) {
      this.logger.error(`Failed to fallback to memory queue: ${error.message}`);
    }
  }
}

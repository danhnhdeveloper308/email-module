import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { EventEmitter } from 'events';
import { QueueJob } from '../interfaces/queue-job.interface';

/**
 * MemoryQueueService - In-Memory Queue Implementation
 * 
 * 🎯 MỤC ĐÍCH CHÍNH:
 * 1. FALLBACK MECHANISM: Thay thế Redis khi connection không khả dụng
 * 2. DEVELOPMENT MODE: Hỗ trợ development mà không cần Redis setup
 * 3. TESTING: Tạo môi trường test isolated không phụ thuộc external services
 * 4. ZERO-DEPENDENCY: Hoạt động hoàn toàn independent
 * 
 * ⚡ TÍNH NĂNG:
 * - Queue jobs in memory (waiting, active, completed, failed, delayed)
 * - Job processing với retry mechanism
 * - Event-driven architecture (emit 'process' events)
 * - Job timeout handling (30 seconds)
 * - Exponential backoff cho retry
 * - Concurrency control (max 3 active jobs)
 * 
 * 🔄 WORKFLOW:
 * 1. Jobs được add vào waiting queue
 * 2. Processing interval (1 second) check và process jobs
 * 3. Emit 'process' event để EmailProcessor handle
 * 4. Wait for jobCompleted/jobFailed signals
 * 5. Move job to appropriate queue (completed/failed)
 * 
 * 💾 MEMORY MANAGEMENT:
 * - Giữ tối đa 100 completed jobs
 * - Giữ tối đa 50 failed jobs
 * - Auto cleanup old jobs
 * 
 * ⚠️  LIMITATIONS:
 * - Data lost khi restart application
 * - Không scale across multiple instances
 * - Memory usage tăng theo số lượng jobs
 * - Không có persistence
 */

export interface QueueStats {
  waiting: QueueJob[];
  active: QueueJob[];
  completed: QueueJob[];
  failed: QueueJob[];
  delayed: QueueJob[];
}

@Injectable()
export class MemoryQueueService extends EventEmitter implements OnModuleDestroy {
  private readonly logger = new Logger(MemoryQueueService.name);
  
  // 📦 In-memory storage cho jobs
  private jobs: Map<string, QueueJob> = new Map();
  
  // 🎯 Queue categories để organize jobs
  private queues: QueueStats = {
    waiting: [],   // ⏳ Chờ xử lý
    active: [],    // 🔄 Đang xử lý
    completed: [], // ✅ Đã hoàn thành
    failed: [],    // ❌ Thất bại
    delayed: [],   // ⏰ Chờ delay time
  };
  
  private processingInterval?: NodeJS.Timeout;
  private jobIdCounter = 1;

  constructor() {
    super();
    this.startProcessing();
    this.logger.log('📦 Memory Queue initialized (Redis-free mode)');
    this.logger.log('🎯 Purpose: Fallback mechanism when Redis unavailable');
    this.logger.log('💡 Features: In-memory processing, auto-retry, event-driven');
  }

  /**
   * 📝 ADD JOB - Thêm job vào queue
   * 
   * @param jobName - Tên job (e.g., 'send-email')
   * @param data - Payload data
   * @param opts - Options (delay, attempts, etc.)
   * @returns Promise<QueueJob>
   */
  async add(jobName: string, data: any, opts: any = {}): Promise<QueueJob> {
    const job: QueueJob = {
      id: (this.jobIdCounter++).toString(),
      name: jobName,
      data,
      opts,
      timestamp: Date.now(),
      attempts: 0,
      failedReason: undefined,
    };

    this.jobs.set(job.id, job);

    // 🕐 Handle delayed jobs (scheduled emails)
    if (opts.delay && opts.delay > 0) {
      this.queues.delayed.push(job);
      this.logger.log(`⏰ Job ${job.id} scheduled with ${opts.delay}ms delay`);
      
      // Auto move to waiting queue after delay
      setTimeout(() => {
        this.moveFromDelayedToWaiting(job.id);
      }, opts.delay);
    } else {
      // 📥 Add to waiting queue immediately
      this.queues.waiting.push(job);
      this.logger.log(`➕ Job ${job.id} (${jobName}) added to waiting queue. Queue size: ${this.queues.waiting.length}`);
    }

    return job;
  }

  /**
   * 🚀 START PROCESSING - Bắt đầu processing loop
   * 
   * Chạy interval mỗi 1 giây để check và process jobs từ waiting queue
   */
  private startProcessing(): void {
    this.processingInterval = setInterval(() => {
      this.processNextJob();
    }, 1000);
    
    this.logger.log('🚀 Processing loop started (1 second interval)');
  }

  /**
   * 🔄 PROCESS NEXT JOB - Xử lý job tiếp theo
   * 
   * Logic:
   * 1. Check waiting queue có jobs không
   * 2. Check concurrency limit (max 3 active)
   * 3. Move job từ waiting -> active
   * 4. Emit 'process' event cho EmailProcessor
   * 5. Wait for completion signal
   */
  private async processNextJob(): Promise<void> {
    // 📋 No jobs waiting
    if (this.queues.waiting.length === 0) {
      return;
    }
    
    // 🚦 Concurrency control - max 3 active jobs
    if (this.queues.active.length >= 3) {
      this.logger.debug(`⏸️  Queue full, waiting (active: ${this.queues.active.length})`);
      return;
    }

    // 📤 Get next job from waiting queue
    const job = this.queues.waiting.shift();
    if (!job) return;

    // 📍 Move to active queue
    this.queues.active.push(job);
    this.logger.log(`🔄 Processing job ${job.id} (${job.name}). Active: ${this.queues.active.length}, Waiting: ${this.queues.waiting.length}`);

    try {
      // 📡 EMIT PROCESS EVENT - EmailProcessor sẽ listen event này
      this.logger.debug(`📡 Emitting process event for job ${job.id}`);
      this.emit('process', job);
      
      // ⏱️ Wait for job completion (with timeout)
      await this.processJob(job);
      
      // ✅ Move to completed queue
      this.moveToCompleted(job);
    } catch (error) {
      // ❌ Handle failure
      this.logger.error(`❌ Job ${job.id} failed in processNextJob: ${error.message}`);
      this.handleJobFailure(job, error);
    }
  }

  /**
   * ⏱️ PROCESS JOB - Wait for external processing
   * 
   * Tạo Promise chờ signal từ EmailProcessor:
   * - jobCompleted(jobId) -> resolve
   * - jobFailed(jobId, error) -> reject
   * - timeout 30 seconds -> reject
   */
  private async processJob(job: QueueJob): Promise<void> {
    return new Promise((resolve, reject) => {
      // 🕐 30 second timeout
      const timeout = setTimeout(() => {
        this.logger.warn(`⏰ Job ${job.id} timed out after 30 seconds`);
        this.off('jobCompleted', onCompleted);
        this.off('jobFailed', onFailed);
        reject(new Error('Job timeout'));
      }, 30000);

      // ✅ Success handler
      const onCompleted = (completedJobId: string) => {
        if (completedJobId === job.id) {
          clearTimeout(timeout);
          this.off('jobCompleted', onCompleted);
          this.off('jobFailed', onFailed);
          resolve();
        }
      };

      // ❌ Failure handler
      const onFailed = (failedJobId: string, error: Error) => {
        if (failedJobId === job.id) {
          clearTimeout(timeout);
          this.off('jobCompleted', onCompleted);
          this.off('jobFailed', onFailed);
          reject(error);
        }
      };

      // 👂 Listen for completion signals
      this.on('jobCompleted', onCompleted);
      this.on('jobFailed', onFailed);
    });
  }

  /**
   * ✅ MOVE TO COMPLETED - Chuyển job sang completed queue
   */
  private moveToCompleted(job: QueueJob): void {
    // Remove from active
    const activeIndex = this.queues.active.findIndex(j => j.id === job.id);
    if (activeIndex !== -1) {
      this.queues.active.splice(activeIndex, 1);
    }

    // Add to completed
    this.queues.completed.push(job);
    
    // 🧹 Cleanup - chỉ giữ 100 completed jobs gần nhất
    if (this.queues.completed.length > 100) {
      this.queues.completed.shift();
    }

    this.logger.log(`✅ Job ${job.id} moved to completed. Completed: ${this.queues.completed.length}, Active: ${this.queues.active.length}`);
  }

  /**
   * ❌ HANDLE JOB FAILURE - Xử lý job thất bại với retry logic
   */
  private handleJobFailure(job: QueueJob, error: any): void {
    job.attempts++;
    job.failedReason = error.message || 'Unknown error';

    // Remove from active
    const activeIndex = this.queues.active.findIndex(j => j.id === job.id);
    if (activeIndex !== -1) {
      this.queues.active.splice(activeIndex, 1);
    }

    const maxAttempts = job.opts?.attempts || 3;
    
    // 🔄 RETRY LOGIC
    if (job.attempts < maxAttempts) {
      // 📈 Exponential backoff: 1s, 2s, 4s, 8s...
      const delay = Math.min(1000 * Math.pow(2, job.attempts), 30000);
      
      setTimeout(() => {
        this.queues.waiting.push(job);
        this.logger.debug(`🔄 Job ${job.id} retrying (attempt ${job.attempts}/${maxAttempts})`);
      }, delay);
      
    } else {
      // 💀 PERMANENT FAILURE
      this.queues.failed.push(job);
      this.logger.error(`💀 Job ${job.id} failed permanently: ${error.message}`);
      
      // 🧹 Cleanup - chỉ giữ 50 failed jobs gần nhất
      if (this.queues.failed.length > 50) {
        this.queues.failed.shift();
      }
    }
  }

  /**
   * ⏰ MOVE DELAYED TO WAITING - Chuyển delayed job sang waiting
   */
  private moveFromDelayedToWaiting(jobId: string): void {
    const delayedIndex = this.queues.delayed.findIndex(j => j.id === jobId);
    if (delayedIndex !== -1) {
      const job = this.queues.delayed.splice(delayedIndex, 1)[0];
      this.queues.waiting.push(job);
      this.logger.log(`⏰ Moved delayed job ${jobId} to waiting queue`);
    }
  }

  // 📊 GETTER METHODS - Trả về copy của queues để tránh mutation
  async getWaiting(): Promise<QueueJob[]> {
    return [...this.queues.waiting];
  }

  async getActive(): Promise<QueueJob[]> {
    return [...this.queues.active];
  }

  async getCompleted(): Promise<QueueJob[]> {
    return [...this.queues.completed.slice(-100)]; // Latest 100
  }

  async getFailed(): Promise<QueueJob[]> {
    return [...this.queues.failed.slice(-50)]; // Latest 50
  }

  async getDelayed(): Promise<QueueJob[]> {
    return [...this.queues.delayed];
  }

  /**
   * ✅ JOB COMPLETED SIGNAL - EmailProcessor gọi method này khi job thành công
   */
  jobCompleted(jobId: string): void {
    this.logger.debug(`📢 Received completion signal for job ${jobId}`);
    this.emit('jobCompleted', jobId);
  }

  /**
   * ❌ JOB FAILED SIGNAL - EmailProcessor gọi method này khi job thất bại
   */
  jobFailed(jobId: string, error: Error): void {
    this.logger.debug(`📢 Received failure signal for job ${jobId}: ${error.message}`);
    this.emit('jobFailed', jobId, error);
  }

  /**
   * 🧹 CLEANUP - Clear interval khi module destroy
   */
  onModuleDestroy(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }
    this.logger.log('🧹 Memory Queue destroyed - processing stopped');
    this.logger.log(`📊 Final stats: ${this.queues.waiting.length} waiting, ${this.queues.active.length} active, ${this.queues.completed.length} completed, ${this.queues.failed.length} failed`);
  }
}

/**
 * 🎯 TỔNG KẾT MỤC ĐÍCH CỦA MEMORY QUEUE SERVICE:
 * 
 * 1. 🔄 FALLBACK MECHANISM:
 *    - Khi Redis Upstash connection timeout/fail
 *    - Đảm bảo email service vẫn hoạt động
 *    - Seamless switching từ Redis sang Memory
 * 
 * 2. 🛠️ DEVELOPMENT SUPPORT:
 *    - Developers không cần setup Redis local
 *    - Quick start cho testing
 *    - Zero external dependencies
 * 
 * 3. 🧪 TESTING ENVIRONMENT:
 *    - Isolated testing không ảnh hưởng production Redis
 *    - Predictable behavior
 *    - Easy to reset state
 * 
 * 4. 📈 PRODUCTION RELIABILITY:
 *    - Backup plan khi Redis cluster down
 *    - Graceful degradation
 *    - No service interruption
 * 
 * 5. 🎮 FEATURE COMPATIBILITY:
 *    - Same interface như BullMQ Redis Queue
 *    - Drop-in replacement
 *    - Event-driven như Redis queues
 * 
 * 🔀 WORKFLOW WITH REDIS QUEUE:
 * 
 * Normal Flow (Redis Available):
 * QueueService -> BullMQ -> Redis -> Worker -> EmailProcessor
 * 
 * Fallback Flow (Redis Unavailable):
 * QueueService -> MemoryQueueService -> EventEmitter -> EmailProcessor
 * 
 * 📋 KHI NÀO SỬ DỤNG:
 * ✅ Development/Testing
 * ✅ Redis connection issues
 * ✅ Low-volume email sending
 * ✅ Prototype/Demo
 * 
 * ❌ KHI NÀO KHÔNG NÊN:
 * ❌ High-volume production (>1000 emails/hour)
 * ❌ Multi-instance deployment
 * ❌ Need job persistence across restarts
 * ❌ Complex job scheduling requirements
 */

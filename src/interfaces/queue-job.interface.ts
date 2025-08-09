export interface QueueJob {
  id: string;
  name: string;
  data: any;
  opts?: any;
  timestamp: number;
  attempts: number;
  failedReason?: string;
}

export interface QueueStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed?: number;
  type: 'redis' | 'memory' | 'unknown';
  url?: string;
  error?: string;
  recovery?: QueueRecoveryInfo;
}

// ✅ Add recovery interface
export interface QueueRecoveryInfo {
  isRedisAvailable: boolean;
  lastRedisCheck: Date;
  pendingRecovery: boolean;
  recoveryAttempts: number;
}

// ✅ Add queue adapter interface for extensibility
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
  on?(event: string, callback: Function): void;
}

// ✅ Add processor interface for custom processors
export interface QueueProcessor {
  process(job: QueueJob): Promise<void>;
}

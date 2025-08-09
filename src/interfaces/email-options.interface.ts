export interface EmailOptions {
  from?: string;
  cc?: string | string[];
  bcc?: string | string[];
  attachments?: EmailAttachment[];
  tags?: string[];
  campaignId?: string;
  batchId?: string;
  trackOpens?: boolean;
  trackClicks?: boolean;
  deliveryTime?: Date;
  userId?: string;
  priority?: 'high' | 'normal' | 'low';
  replyTo?: string;
}

export interface EmailAttachment {
  filename: string;
  content: string | Buffer;
  contentType?: string;
  cid?: string;
}

export interface LoginInfo {
  ipAddress?: string;
  userAgent?: string;
  device?: string;
  location?: string;
  time?: Date;
  isNewDevice?: boolean;
}

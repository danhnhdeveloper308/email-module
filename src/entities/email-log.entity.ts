import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum EmailStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SENT = 'sent',
  DELIVERED = 'delivered',
  OPENED = 'opened',
  CLICKED = 'clicked',
  BOUNCED = 'bounced',
  FAILED = 'failed',
}

@Entity('email_logs')
export class EmailLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  emailId: string;

  @Column()
  to: string;

  @Column()
  subject: string;

  @Column()
  @Index()
  template: string;

  @Column('json')
  context: Record<string, any>;

  @Column({
    type: 'varchar',
    default: EmailStatus.PENDING,
  })
  @Index()
  status: EmailStatus;

  @Column({nullable: true})
  messageId?: string;

  @Column({default: 0})
  attempts: number;

  @Column({nullable: true})
  error?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({nullable: true})
  sentAt?: Date;

  @Column({nullable: true})
  openedAt?: Date;

  @Column({nullable: true})
  clickedAt?: Date;

  @Column({nullable: true})
  clickUrl?: string;

  @Column({default: 0})
  openCount: number;

  @Column({default: 0})
  clickCount: number;

  @Column({nullable: true})
  @Index()
  campaignId?: string;

  @Column({nullable: true})
  @Index()
  batchId?: string;

  @Column({nullable: true})
  userId?: string;

  @Column('json', {nullable: true})
  tags?: string[];

  @Column({nullable: true})
  lastStatusAt?: Date;

  @Column({nullable: true})
  resendId?: string;
}

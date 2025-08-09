import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum EmailEventType {
  SENT = 'sent',
  DELIVERED = 'delivered',
  OPENED = 'opened',
  CLICKED = 'clicked',
  BOUNCED = 'bounced',
  FAILED = 'failed',
}

@Entity('email_events')
export class EmailEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  emailId: string;

  @Column('varchar')
  @Index()
  event: EmailEventType;

  @Column()
  recipient: string;

  @Column()
  timestamp: Date;

  @Column('json', {nullable: true})
  metadata?: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;
}

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('email_stats')
export class EmailStats {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({type: 'date'})
  @Index()
  date: Date;

  @Column({nullable: true})
  @Index()
  template?: string;

  @Column({nullable: true})
  @Index()
  campaignId?: string;

  @Column({default: 0})
  sent: number;

  @Column({default: 0})
  delivered: number;

  @Column({default: 0})
  opened: number;

  @Column({default: 0})
  clicked: number;

  @Column({default: 0})
  bounced: number;

  @Column({default: 0})
  failed: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

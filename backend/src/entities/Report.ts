import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './User.js';

export type ReportReason = 'spam' | 'harassment' | 'scam' | 'inappropriate' | 'other';
export type ReportStatus = 'new' | 'in_review' | 'resolved';
export type ReportAction = 'dismissed' | 'warned' | 'content_removed' | 'suspended' | 'escalated';

@Entity('reports')
export class Report {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: "varchar" })
  @Index()
  reporterId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'reporterId' })
  reporter: User;

  @Column({ type: "varchar", nullable: true })
  @Index()
  reportedUserId: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'reportedUserId' })
  reportedUser: User | null;

  @Column({ type: "varchar", nullable: true })
  reportedPostId: string | null;

  @Column({ type: "varchar", nullable: true })
  reportedCommentId: string | null;

  @Column({ type: 'jsonb' })
  reasons: ReportReason[];

  @Column({ type: 'text', nullable: true })
  details: string | null;

  @Column({ type: "boolean", default: false })
  includeMessageHistory: boolean;

  @Column({ type: 'varchar', default: 'new' })
  @Index()
  status: ReportStatus;

  @Column({ type: "varchar", nullable: true })
  claimedBy: string | null;

  @Column({ type: 'jsonb', nullable: true })
  resolution: {
    action: ReportAction;
    moderatorId: string;
    reason: string;
    timestamp: number;
  } | null;

  @CreateDateColumn()
  timestamp: Date;

  toJSON() {
    return {
      id: this.id,
      reporterId: this.reporterId,
      reportedUserId: this.reportedUserId || undefined,
      reportedPostId: this.reportedPostId || undefined,
      reportedCommentId: this.reportedCommentId || undefined,
      reasons: this.reasons,
      details: this.details || undefined,
      includeMessageHistory: this.includeMessageHistory || undefined,
      status: this.status,
      claimedBy: this.claimedBy || undefined,
      timestamp: this.timestamp.getTime(),
      resolution: this.resolution || undefined,
    };
  }
}

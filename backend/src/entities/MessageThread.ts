import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
  Relation,
} from 'typeorm';
import type { Post } from './Post.js';
import type { Message } from './Message.js';

export type MessageThreadStatus =
  | 'active'
  | 'declined_by_owner'
  | 'cancelled_by_requester'
  | 'post_removed'
  | 'dismissed'
  | 'given_to_other'
  | 'accepted'
  | 'on_loan';

@Entity('message_threads')
export class MessageThread {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: "varchar" })
  @Index()
  postId: string;

  @ManyToOne('Post', 'messageThreads', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'postId' })
  post: Relation<Post>;

  // Two participants
  @Column({ type: 'jsonb' })
  participants: string[];

  @Column({ type: 'timestamp' })
  lastMessageAt: Date;

  // Unread count per user
  @Column({ type: 'jsonb', default: {} })
  unreadCount: { [userId: string]: number };

  // Thread status for request/completion flow
  @Column({ type: 'varchar', default: 'active' })
  @Index()
  status: MessageThreadStatus;

  // Handoff confirmation (gift/trade/loan)
  @Column({ type: 'boolean', default: false })
  ownerCompleted: boolean;

  @Column({ type: 'boolean', default: false })
  requesterCompleted: boolean;

  // Return confirmation (loan only)
  @Column({ type: 'boolean', default: false })
  ownerConfirmedReturn: boolean;

  @Column({ type: 'boolean', default: false })
  requesterConfirmedReturn: boolean;

  // Loan tracking
  @Column({ type: 'timestamp', nullable: true })
  loanDueDate: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany('Message', 'thread')
  messages: Relation<Message[]>;

  toJSON() {
    return {
      id: this.id,
      postId: this.postId,
      participants: this.participants,
      lastMessageAt: this.lastMessageAt.getTime(),
      unreadCount: this.unreadCount,
      status: this.status,
      ownerCompleted: this.ownerCompleted,
      requesterCompleted: this.requesterCompleted,
      ownerConfirmedReturn: this.ownerConfirmedReturn,
      requesterConfirmedReturn: this.requesterConfirmedReturn,
      loanDueDate: this.loanDueDate?.getTime() || null,
    };
  }
}

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
import type { User } from './User.js';
import type { MessageThread } from './MessageThread.js';

export type PostType = 'giveaway' | 'exchange' | 'loan';
export type PostStatus = 'active' | 'pending_exchange' | 'archived';

@Entity('posts')
export class Post {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: "varchar" })
  @Index()
  userId: string;

  @ManyToOne('User', 'posts')
  @JoinColumn({ name: 'userId' })
  user: Relation<User>;

  // Book info stored as JSON
  @Column({ type: 'jsonb' })
  book: {
    title: string;
    author: string;
    coverImage?: string;
    genre: string;
    isbn?: string;
  };

  @Column({ type: 'varchar' })
  @Index()
  type: PostType;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'varchar', default: 'active' })
  @Index()
  status: PostStatus;

  @Column({ type: 'jsonb', nullable: true })
  pendingExchange: {
    initiatorUserId: string;
    recipientUserId: string;
    givingPostId: string;
    receivingPostId: string;
    timestamp: number;
  } | null;

  @Column({ type: 'timestamp', nullable: true })
  archivedAt: Date | null;

  @Column({ type: 'varchar', nullable: true })
  givenTo: string | null;

  @Column({ type: 'int', nullable: true })
  loanDuration: number | null; // in days: 30, 60, or 90

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @OneToMany('MessageThread', 'post')
  messageThreads: Relation<MessageThread[]>;

  toJSON() {
    return {
      id: this.id,
      userId: this.userId,
      book: this.book,
      type: this.type,
      notes: this.notes || undefined,
      createdAt: this.createdAt.getTime(),
      status: this.status,
      pendingExchange: this.pendingExchange || undefined,
      archivedAt: this.archivedAt?.getTime(),
      givenTo: this.givenTo || undefined,
      loanDuration: this.loanDuration || undefined,
    };
  }
}

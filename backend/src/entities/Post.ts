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
} from 'typeorm';
import { User } from './User.js';
import { Comment } from './Comment.js';
import { MessageThread } from './MessageThread.js';

export type PostType = 'giveaway' | 'exchange';
export type PostStatus = 'active' | 'pending_exchange' | 'archived';

@Entity('posts')
export class Post {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: "varchar" })
  @Index()
  userId: string;

  @ManyToOne(() => User, (user) => user.posts)
  @JoinColumn({ name: 'userId' })
  user: User;

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

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @OneToMany(() => Comment, (comment) => comment.post)
  comments: Comment[];

  @OneToMany(() => MessageThread, (thread) => thread.post)
  messageThreads: MessageThread[];

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
    };
  }
}

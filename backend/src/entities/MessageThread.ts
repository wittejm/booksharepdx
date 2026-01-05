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
    };
  }
}

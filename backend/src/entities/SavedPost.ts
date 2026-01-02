import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { User } from './User.js';
import { Post } from './Post.js';

@Entity('saved_posts')
@Unique(['userId', 'postId'])
export class SavedPost {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: "varchar" })
  @Index()
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: "varchar" })
  @Index()
  postId: string;

  @ManyToOne(() => Post, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'postId' })
  post: Post;

  @Column({ type: "boolean", default: false })
  expressedInterest: boolean;

  @CreateDateColumn()
  timestamp: Date;

  toJSON() {
    return {
      userId: this.userId,
      postId: this.postId,
      timestamp: this.timestamp.getTime(),
      expressedInterest: this.expressedInterest,
    };
  }
}

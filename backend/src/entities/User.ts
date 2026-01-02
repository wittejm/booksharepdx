import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { Post } from './Post.js';
import { Comment } from './Comment.js';
import { Message } from './Message.js';

export type UserRole = 'user' | 'moderator' | 'admin';
export type LocationType = 'neighborhood' | 'pin';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: "varchar", unique: true })
  @Index()
  email: string;

  @Column({ type: "varchar", unique: true })
  @Index()
  username: string;

  @Column({ type: "varchar" })
  passwordHash: string;

  @Column({ type: 'text', default: '' })
  bio: string;

  @Column({ type: "boolean", default: false })
  verified: boolean;

  @Column({ type: 'varchar', default: 'user' })
  role: UserRole;

  // Location
  @Column({ type: 'varchar', default: 'neighborhood' })
  locationType: LocationType;

  @Column({ type: 'varchar', nullable: true })
  neighborhoodId: string | null;

  @Column({ type: 'float', nullable: true })
  locationLat: number | null;

  @Column({ type: 'float', nullable: true })
  locationLng: number | null;

  // Stats (denormalized for performance)
  @Column({ type: "int", default: 0 })
  booksGiven: number;

  @Column({ type: "int", default: 0 })
  booksReceived: number;

  @Column({ type: "int", default: 0 })
  bookshares: number;

  // Profile extras
  @Column({ type: 'text', nullable: true })
  profilePicture: string | null;

  @Column({ type: 'jsonb', nullable: true })
  readingPreferences: {
    favoriteGenres?: string[];
    favoriteAuthors?: string[];
    favoriteBooks?: any[];
    lookingForBooks?: any[];
    lookingForGenres?: string[];
    lookingForAuthors?: string[];
  } | null;

  @Column({ type: 'jsonb', nullable: true })
  socialLinks: { label: string; url: string }[] | null;

  // Moderation
  @Column({ type: 'jsonb', nullable: true })
  suspended: { until: number; reason: string } | null;

  @Column({ type: "boolean", default: false })
  banned: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @OneToMany(() => Post, (post) => post.user)
  posts: Post[];

  @OneToMany(() => Comment, (comment) => comment.user)
  comments: Comment[];

  @OneToMany(() => Message, (message) => message.sender)
  messages: Message[];

  // Convert to API response format (matching shared types)
  toJSON() {
    return {
      id: this.id,
      email: this.email,
      username: this.username,
      bio: this.bio,
      verified: this.verified,
      createdAt: this.createdAt.getTime(),
      location: {
        type: this.locationType,
        neighborhoodId: this.neighborhoodId || undefined,
        lat: this.locationLat || undefined,
        lng: this.locationLng || undefined,
      },
      profilePicture: this.profilePicture || undefined,
      stats: {
        booksGiven: this.booksGiven,
        booksReceived: this.booksReceived,
        bookshares: this.bookshares,
      },
      readingPreferences: this.readingPreferences || undefined,
      socialLinks: this.socialLinks || undefined,
      role: this.role,
      suspended: this.suspended || undefined,
      banned: this.banned || undefined,
    };
  }
}

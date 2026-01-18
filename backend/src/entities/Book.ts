import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
  Relation,
} from 'typeorm';
import type { Post } from './Post.js';

@Entity('books')
export class Book {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', nullable: true, unique: true })
  @Index()
  googleBooksId: string | null;

  @Column({ type: 'varchar', nullable: true })
  @Index()
  isbn: string | null;

  @Column({ type: 'varchar' })
  @Index()
  title: string;

  @Column({ type: 'varchar' })
  @Index()
  author: string;

  @Column({ type: 'text', nullable: true })
  coverImage: string | null;

  @Column({ type: 'varchar', nullable: true })
  genre: string | null;

  @Column({ type: 'int', default: 0 })
  timesGifted: number;

  @Column({ type: 'int', default: 0 })
  timesTraded: number;

  @Column({ type: 'int', default: 0 })
  timesLoaned: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany('Post', 'book')
  posts: Relation<Post[]>;

  toJSON() {
    return {
      id: this.id,
      googleBooksId: this.googleBooksId || undefined,
      title: this.title,
      author: this.author,
      isbn: this.isbn || undefined,
      coverImage: this.coverImage || undefined,
      genre: this.genre || undefined,
      timesGifted: this.timesGifted,
      timesTraded: this.timesTraded,
      timesLoaned: this.timesLoaned,
    };
  }
}

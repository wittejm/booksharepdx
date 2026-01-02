import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('books')
export class Book {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: "varchar" })
  @Index()
  title: string;

  @Column({ type: "varchar" })
  @Index()
  author: string;

  @Column({ type: "varchar", nullable: true })
  @Index()
  isbn: string | null;

  @Column({ type: 'text', nullable: true })
  coverImage: string | null;

  @Column({ type: "varchar", nullable: true })
  genre: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: "varchar", nullable: true })
  externalId: string | null; // Google Books or OpenLibrary ID

  @Column({ type: "varchar", nullable: true })
  externalSource: string | null; // 'google' or 'openlibrary'

  @CreateDateColumn()
  createdAt: Date;

  toJSON() {
    return {
      id: this.id,
      title: this.title,
      author: this.author,
      isbn: this.isbn || undefined,
      coverImage: this.coverImage || undefined,
      genre: this.genre || undefined,
      description: this.description || undefined,
    };
  }
}

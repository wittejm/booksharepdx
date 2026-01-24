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
} from "typeorm";
import type { User } from "./User.js";
import type { Book } from "./Book.js";
import type { MessageThread } from "./MessageThread.js";

export type PostType = "giveaway" | "exchange" | "loan";
export type PostStatus = "active" | "agreed_upon" | "archived";

@Entity("posts")
export class Post {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "varchar" })
  @Index()
  userId: string;

  @ManyToOne("User", "posts")
  @JoinColumn({ name: "userId" })
  user: Relation<User>;

  @Column({ type: "varchar" })
  @Index()
  bookId: string;

  @ManyToOne("Book", "posts", { eager: true })
  @JoinColumn({ name: "bookId" })
  book: Relation<Book>;

  @Column({ type: "varchar" })
  @Index()
  type: PostType;

  @Column({ type: "varchar", default: "active" })
  @Index()
  status: PostStatus;

  @Column({ type: "jsonb", nullable: true })
  agreedExchange: {
    responderUserId: string;
    sharerUserId: string;
    responderPostId: string;
    sharerPostId: string;
    timestamp?: number;
  } | null;

  @Column({ type: "timestamp", nullable: true })
  archivedAt: Date | null;

  @Column({ type: "varchar", nullable: true })
  givenTo: string | null;

  @Column({ type: "int", nullable: true })
  loanDuration: number | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany("MessageThread", "post")
  messageThreads: Relation<MessageThread[]>;

  toJSON() {
    return {
      id: this.id,
      userId: this.userId,
      book: this.book?.toJSON?.() || this.book,
      type: this.type,
      createdAt: this.createdAt.getTime(),
      status: this.status,
      agreedExchange: this.agreedExchange || undefined,
      archivedAt: this.archivedAt?.getTime(),
      givenTo: this.givenTo || undefined,
      loanDuration: this.loanDuration || undefined,
    };
  }
}

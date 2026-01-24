import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from "typeorm";
import { User } from "./User.js";

export type NotificationType =
  | "exchange_proposed"
  | "exchange_confirmed"
  | "exchange_declined"
  | "message"
  | "moderator_action";

@Entity("notifications")
export class Notification {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "varchar" })
  @Index()
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: "userId" })
  user: User;

  @Column({ type: "varchar" })
  type: NotificationType;

  @Column({ type: "text" })
  content: string;

  @Column({ type: "boolean", default: false })
  @Index()
  read: boolean;

  @Column({ type: "varchar", nullable: true })
  relatedId: string | null; // post, message, or report id

  @CreateDateColumn()
  timestamp: Date;

  toJSON() {
    return {
      id: this.id,
      userId: this.userId,
      type: this.type,
      content: this.content,
      read: this.read,
      timestamp: this.timestamp.getTime(),
      relatedId: this.relatedId || undefined,
    };
  }
}

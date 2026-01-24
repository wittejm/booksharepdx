import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Relation,
} from "typeorm";
import type { User } from "./User.js";
import type { MessageThread } from "./MessageThread.js";

export type MessageType = "user" | "system" | "trade_proposal";
export type SystemMessageType =
  | "exchange_proposed"
  | "exchange_completed"
  | "exchange_declined"
  | "exchange_cancelled"
  | "gift_completed"
  | "request_cancelled";
export type ProposalStatus = "pending" | "accepted" | "declined";

@Entity("messages")
export class Message {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "varchar" })
  @Index()
  threadId: string;

  @ManyToOne("MessageThread", "messages", { onDelete: "CASCADE" })
  @JoinColumn({ name: "threadId" })
  thread: Relation<MessageThread>;

  @Column({ type: "varchar" })
  senderId: string;

  @ManyToOne("User", "messages")
  @JoinColumn({ name: "senderId" })
  sender: Relation<User>;

  @Column({ type: "text" })
  content: string;

  @Column({ type: "varchar", default: "user" })
  type: MessageType;

  @Column({ type: "varchar", nullable: true })
  systemMessageType: SystemMessageType | null;

  // Trade proposal fields (only for type: 'trade_proposal')
  @Column({ type: "varchar", nullable: true })
  offeredPostId: string | null; // The proposer's book

  @Column({ type: "varchar", nullable: true })
  requestedPostId: string | null; // The book they want

  @Column({ type: "varchar", nullable: true })
  proposalStatus: ProposalStatus | null;

  @CreateDateColumn()
  timestamp: Date;

  toJSON() {
    return {
      id: this.id,
      threadId: this.threadId,
      senderId: this.senderId,
      content: this.content,
      timestamp: this.timestamp.getTime(),
      type: this.type,
      systemMessageType: this.systemMessageType || undefined,
      offeredPostId: this.offeredPostId || undefined,
      requestedPostId: this.requestedPostId || undefined,
      proposalStatus: this.proposalStatus || undefined,
    };
  }
}

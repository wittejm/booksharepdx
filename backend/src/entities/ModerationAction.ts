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

export type ModerationActionType =
  | "warning"
  | "content_removed"
  | "suspended"
  | "banned";

@Entity("moderation_actions")
export class ModerationAction {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "varchar" })
  @Index()
  moderatorId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: "moderatorId" })
  moderator: User;

  @Column({ type: "varchar" })
  @Index()
  targetUserId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: "targetUserId" })
  targetUser: User;

  @Column({ type: "varchar" })
  action: ModerationActionType;

  @Column({ type: "text" })
  reason: string;

  @Column({ type: "varchar", nullable: true })
  targetContentId: string | null;

  @Column({ type: "int", nullable: true })
  suspensionDuration: number | null; // days

  @CreateDateColumn()
  timestamp: Date;

  toJSON() {
    return {
      id: this.id,
      moderatorId: this.moderatorId,
      targetUserId: this.targetUserId,
      action: this.action,
      reason: this.reason,
      timestamp: this.timestamp.getTime(),
      targetContentId: this.targetContentId || undefined,
      suspensionDuration: this.suspensionDuration || undefined,
    };
  }
}

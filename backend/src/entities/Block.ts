import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from "typeorm";
import { User } from "./User.js";

@Entity("blocks")
@Unique(["blockerId", "blockedId"])
export class Block {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "varchar" })
  @Index()
  blockerId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: "blockerId" })
  blocker: User;

  @Column({ type: "varchar" })
  @Index()
  blockedId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: "blockedId" })
  blocked: User;

  @CreateDateColumn()
  timestamp: Date;

  toJSON() {
    return {
      blockerId: this.blockerId,
      blockedId: this.blockedId,
      timestamp: this.timestamp.getTime(),
    };
  }
}

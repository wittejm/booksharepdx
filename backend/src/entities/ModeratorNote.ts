import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './User.js';
import { Report } from './Report.js';

@Entity('moderator_notes')
export class ModeratorNote {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: "varchar" })
  @Index()
  reportId: string;

  @ManyToOne(() => Report, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'reportId' })
  report: Report;

  @Column({ type: "varchar" })
  moderatorId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'moderatorId' })
  moderator: User;

  @Column({ type: 'text' })
  note: string;

  @CreateDateColumn()
  timestamp: Date;

  toJSON() {
    return {
      reportId: this.reportId,
      moderatorId: this.moderatorId,
      note: this.note,
      timestamp: this.timestamp.getTime(),
    };
  }
}

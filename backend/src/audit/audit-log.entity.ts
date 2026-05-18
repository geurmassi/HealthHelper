import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Referral } from '../referrals/referral.entity';
import { User } from '../users/user.entity';

// Append-only record of every meaningful action performed against a referral (HIPAA audit trail).
@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // nullable + SET NULL: keep the audit row if its referral is hard-deleted, so the forensic trail survives.
  @ManyToOne(() => Referral, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'referralId' })
  referral: Referral | null;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  action: string;

  @Column({ type: 'jsonb', nullable: true })
  details: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt: Date;
}

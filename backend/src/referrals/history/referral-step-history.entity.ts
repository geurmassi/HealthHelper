import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/user.entity';
import { Referral } from '../referral.entity';

@Entity('referral_step_history')
export class ReferralStepHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Referral, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'referralId' })
  referral: Referral;

  @Column()
  fromStatus: string;

  @Column()
  toStatus: string;

  @Column({ type: 'varchar', nullable: true })
  fromSubstep: string | null;

  @Column({ type: 'varchar', nullable: true })
  toSubstep: string | null;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'changedById' })
  changedBy: User;

  @Column({ type: 'varchar', nullable: true })
  reason: string | null;

  @CreateDateColumn()
  changedAt: Date;
}

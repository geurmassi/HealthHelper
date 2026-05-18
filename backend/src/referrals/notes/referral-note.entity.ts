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

@Entity('referral_notes')
export class ReferralNote {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Referral, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'referralId' })
  referral: Referral;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'text' })
  content: string;

  @CreateDateColumn()
  createdAt: Date;
}

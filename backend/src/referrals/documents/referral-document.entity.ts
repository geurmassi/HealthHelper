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

@Entity('referral_documents')
export class ReferralDocument {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Referral, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'referralId' })
  referral: Referral;

  @Column()
  fileName: string;

  @Column()
  filePath: string;

  @Column()
  fileType: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'uploadedById' })
  uploadedBy: User;

  @CreateDateColumn()
  uploadedAt: Date;
}

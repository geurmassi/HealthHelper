import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

// Patient demographics + insurance — subject of every referral.
@Entity('patients')
export class Patient {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({ type: 'date' })
  dateOfBirth: string;

  @Column()
  phone: string;

  @Column()
  email: string;

  @Column()
  insuranceProvider: string;

  @Column()
  insurancePlanId: string;

  @Column({ nullable: true, type: 'text' })
  address: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

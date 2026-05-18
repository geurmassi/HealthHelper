import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum UserRole {
  PHYSICIAN = 'physician',
  NURSE_PRACTITIONER = 'nurse_practitioner',
  ADMIN_STAFF = 'admin_staff',
  SPECIALIST_STAFF = 'specialist_staff',
}

// System user — anyone who can authenticate and act in the app; role drives RolesGuard decisions.
@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column({ type: 'enum', enum: UserRole })
  role: UserRole;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

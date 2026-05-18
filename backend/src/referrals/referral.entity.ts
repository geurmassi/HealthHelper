import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Patient } from '../patients/patient.entity';
import { User } from '../users/user.entity';

export enum ReferralType {
  SPECIALTY = 'specialty',
  DIAGNOSTIC = 'diagnostic',
  PROCEDURE = 'procedure',
}

export enum Specialty {
  CARDIOLOGY = 'cardiology',
  DERMATOLOGY = 'dermatology',
  ORTHOPEDICS = 'orthopedics',
  NEUROLOGY = 'neurology',
  RADIOLOGY = 'radiology',
}

export enum ReferralPriority {
  URGENT = 'urgent',
  ROUTINE = 'routine',
  STAT = 'stat',
}

export enum ReferralStatus {
  INTAKE = 'intake',
  CLINICAL_PREP = 'clinical_prep',
  AUTHORIZATION = 'authorization',
  READY_TO_SUBMIT = 'ready_to_submit',
  SUBMITTED = 'submitted',
  SCHEDULING = 'scheduling',
  CLOSED = 'closed',
}

export enum AuthorizationStatus {
  NOT_REQUIRED = 'not_required',
  PENDING = 'pending',
  APPROVED = 'approved',
  DENIED = 'denied',
  APPROVED_WITH_MODIFICATIONS = 'approved_with_modifications',
}

// One referral — the patient's journey from intake through specialist closeout.
@Entity('referrals')
@Index(['status'])
@Index(['specialty'])
@Index(['priority'])
export class Referral {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @ManyToOne(() => Patient, { eager: false })
  @JoinColumn({ name: 'patientId' })
  patient: Patient;

  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'referringProviderId' })
  referringProvider: User;

  @ManyToOne(() => User, { eager: false, nullable: true })
  @JoinColumn({ name: 'specialistId' })
  specialist: User | null;

  @Column({ type: 'enum', enum: ReferralType })
  referralType: ReferralType;

  @Column({ type: 'enum', enum: Specialty })
  specialty: Specialty;

  @Column({ type: 'enum', enum: ReferralPriority })
  priority: ReferralPriority;

  @Column({ type: 'enum', enum: ReferralStatus })
  status: ReferralStatus;

  @Column({ default: '1a' })
  currentSubstep: string;

  // Persisted XState snapshot — written by WorkflowService.initializeMachine on create and replaced on every transition.
  @Column({ type: 'jsonb', nullable: true })
  xstateSnapshot: Record<string, unknown> | null;

  @Column({ type: 'varchar', nullable: true })
  diagnosisCode: string | null;

  @Column({ type: 'text', nullable: true })
  clinicalReason: string | null;

  @Column({ type: 'varchar', nullable: true })
  requestedProcedure: string | null;

  @Column({
    type: 'enum',
    enum: AuthorizationStatus,
    default: AuthorizationStatus.NOT_REQUIRED,
  })
  authorizationStatus: AuthorizationStatus;

  @Column({ type: 'varchar', nullable: true })
  authorizationNumber: string | null;

  @Column({ type: 'text', nullable: true })
  authorizationNotes: string | null;

  @Column({ type: 'timestamp', nullable: true })
  appointmentDate: Date | null;

  @Column({ type: 'varchar', nullable: true })
  appointmentLocation: string | null;

  @Column({ type: 'text', nullable: true })
  specialistReport: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date | null;
}

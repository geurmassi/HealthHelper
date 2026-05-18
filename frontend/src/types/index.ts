// Shared TypeScript types — mirror the backend entities and DTOs.
// Keep these aligned with backend/src/**/*.entity.ts when fields change.

export enum UserRole {
  PHYSICIAN = 'physician',
  NURSE_PRACTITIONER = 'nurse_practitioner',
  ADMIN_STAFF = 'admin_staff',
  SPECIALIST_STAFF = 'specialist_staff',
}

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

export enum Priority {
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

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  phone: string;
  email: string;
  insuranceProvider: string;
  insurancePlanId: string;
}

export interface Referral {
  id: string;
  patient: Patient;
  referringProvider: User;
  specialist: User | null;
  referralType: ReferralType;
  specialty: Specialty;
  priority: Priority;
  status: ReferralStatus;
  currentSubstep: string;
  diagnosisCode: string | null;
  clinicalReason: string | null;
  requestedProcedure: string | null;
  authorizationStatus: AuthorizationStatus;
  authorizationNumber: string | null;
  authorizationNotes: string | null;
  appointmentDate: string | null;
  appointmentLocation: string | null;
  specialistReport: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface ReferralNote {
  id: string;
  user: User;
  content: string;
  createdAt: string;
}

export interface ReferralDocument {
  id: string;
  fileName: string;
  filePath: string;
  fileType: string;
  uploadedBy: User;
  uploadedAt: string;
}

export interface ReferralStepHistory {
  id: string;
  fromStatus: string;
  toStatus: string;
  fromSubstep: string | null;
  toSubstep: string | null;
  changedBy: User;
  reason: string | null;
  changedAt: string;
}

export interface DashboardStats {
  summary: {
    totalReferrals: number;
    averageCompletionDays: number;
    completionRate: number;
    pendingAuthorizations: number;
  };
  byStatus: { status: string; count: number }[];
  bySpecialty: { specialty: string; count: number }[];
  byPriority: { priority: string; count: number }[];
  authorizationBreakdown: { status: string; count: number }[];
  timeToScheduleTrend: { month: string; averageDays: number }[];
}

export interface PaginatedReferrals {
  data: Referral[];
  total: number;
  page: number;
  limit: number;
}

export interface LoginResponse {
  accessToken: string;
  user: User;
}

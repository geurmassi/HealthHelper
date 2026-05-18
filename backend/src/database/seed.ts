import * as bcrypt from 'bcryptjs';
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { AuditLog } from '../audit/audit-log.entity';
import { Patient } from '../patients/patient.entity';
import { ReferralDocument } from '../referrals/documents/referral-document.entity';
import { ReferralStepHistory } from '../referrals/history/referral-step-history.entity';
import { ReferralNote } from '../referrals/notes/referral-note.entity';
import {
  AuthorizationStatus,
  Referral,
  ReferralPriority,
  ReferralStatus,
  ReferralType,
  Specialty,
} from '../referrals/referral.entity';
import { User, UserRole } from '../users/user.entity';

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USER || 'referrals_user',
  password: process.env.DB_PASS || 'referrals_pass',
  database: process.env.DB_NAME || 'referrals_db',
  entities: [
    User,
    Patient,
    Referral,
    ReferralDocument,
    ReferralNote,
    ReferralStepHistory,
    AuditLog,
  ],
  synchronize: true,
});

const DAY_MS = 24 * 60 * 60 * 1000;

function pick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function shuffle<T>(items: T[]): T[] {
  const arr = items.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * DAY_MS);
}

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

async function clear(): Promise<void> {
  await dataSource.query(
    'TRUNCATE TABLE "audit_logs","referral_notes","referral_documents","referral_step_history","referrals","patients","users" RESTART IDENTITY CASCADE;',
  );
}

async function seedUsers(): Promise<User[]> {
  const repo = dataSource.getRepository(User);
  const passwordHash = await bcrypt.hash('password123', 10);
  const seedData = [
    {
      name: 'Dr. Sarah Johnson',
      email: 'sarah.johnson@hospital.com',
      role: UserRole.PHYSICIAN,
    },
    {
      name: 'Dr. James Wilson',
      email: 'james.wilson@hospital.com',
      role: UserRole.PHYSICIAN,
    },
    {
      name: 'Maria Rodriguez',
      email: 'maria.rodriguez@hospital.com',
      role: UserRole.NURSE_PRACTITIONER,
    },
    {
      name: 'Emily Davis',
      email: 'emily.davis@hospital.com',
      role: UserRole.ADMIN_STAFF,
    },
    {
      name: 'Michael Brown',
      email: 'michael.brown@hospital.com',
      role: UserRole.ADMIN_STAFF,
    },
    {
      name: 'Dr. Lisa Chen',
      email: 'lisa.chen@hospital.com',
      role: UserRole.SPECIALIST_STAFF,
    },
  ];
  const users = repo.create(
    seedData.map((u) => ({ ...u, password: passwordHash })),
  );
  return repo.save(users);
}

async function seedPatients(): Promise<Patient[]> {
  const repo = dataSource.getRepository(Patient);
  const seedData = [
    { firstName: 'Ahmed', lastName: 'Ben Salah', dateOfBirth: '1980-04-12', phone: '+216 22 555 101', email: 'ahmed.bensalah@example.tn', insuranceProvider: 'CNAM', insurancePlanId: 'CNAM-1001', address: '12 Rue Habib Bourguiba, Tunis' },
    { firstName: 'Fatma', lastName: 'Trabelsi', dateOfBirth: '1992-11-03', phone: '+216 22 555 102', email: 'fatma.trabelsi@example.tn', insuranceProvider: 'Star', insurancePlanId: 'STAR-2240', address: '88 Avenue de la Liberté, Sfax' },
    { firstName: 'Mohamed', lastName: 'Bouzid', dateOfBirth: '1975-06-25', phone: '+216 22 555 103', email: 'mohamed.bouzid@example.tn', insuranceProvider: 'GAT', insurancePlanId: 'GAT-3375', address: '4 Rue Ibn Khaldoun, Sousse' },
    { firstName: 'Sonia', lastName: 'Khelifi', dateOfBirth: '1988-09-15', phone: '+216 22 555 104', email: 'sonia.khelifi@example.tn', insuranceProvider: 'Carte Assurance', insurancePlanId: 'CA-4180', address: null },
    { firstName: 'Karim', lastName: 'Mansour', dateOfBirth: '1965-02-09', phone: '+216 22 555 105', email: 'karim.mansour@example.tn', insuranceProvider: 'CNAM', insurancePlanId: 'CNAM-5023', address: '210 Avenue Mohamed V, Tunis' },
    { firstName: 'Leila', lastName: 'Hamdi', dateOfBirth: '1999-12-30', phone: '+216 22 555 106', email: 'leila.hamdi@example.tn', insuranceProvider: 'Star', insurancePlanId: 'STAR-6611', address: '37 Rue de Marseille, Bizerte' },
    { firstName: 'Sami', lastName: 'Gharbi', dateOfBirth: '1971-07-19', phone: '+216 22 555 107', email: 'sami.gharbi@example.tn', insuranceProvider: 'GAT', insurancePlanId: 'GAT-7890', address: '511 Rue Charles de Gaulle, Sfax' },
    { firstName: 'Nadia', lastName: 'Ayari', dateOfBirth: '1995-03-08', phone: '+216 22 555 108', email: 'nadia.ayari@example.tn', insuranceProvider: 'Carte Assurance', insurancePlanId: 'CA-8821', address: '6 Rue de la République, Monastir' },
    { firstName: 'Youssef', lastName: 'Belhadj', dateOfBirth: '1983-10-22', phone: '+216 22 555 109', email: 'youssef.belhadj@example.tn', insuranceProvider: 'CNAM', insurancePlanId: 'CNAM-9302', address: null },
    { firstName: 'Amina', lastName: 'Sassi', dateOfBirth: '2001-05-17', phone: '+216 22 555 110', email: 'amina.sassi@example.tn', insuranceProvider: 'Star', insurancePlanId: 'STAR-1057', address: '101 Avenue Bourguiba, Hammamet' },
    { firstName: 'Tarek', lastName: 'Mejri', dateOfBirth: '1978-08-14', phone: '+216 22 555 111', email: 'tarek.mejri@example.tn', insuranceProvider: 'GAT', insurancePlanId: 'GAT-2348', address: '23 Rue Ali Bach Hamba, Tunis' },
    { firstName: 'Hela', lastName: 'Bouchnak', dateOfBirth: '1990-01-28', phone: '+216 22 555 112', email: 'hela.bouchnak@example.tn', insuranceProvider: 'Carte Assurance', insurancePlanId: 'CA-3469', address: '78 Rue de la Kasbah, Kairouan' },
    { firstName: 'Walid', lastName: 'Jendoubi', dateOfBirth: '1968-11-05', phone: '+216 22 555 113', email: 'walid.jendoubi@example.tn', insuranceProvider: 'CNAM', insurancePlanId: 'CNAM-4580', address: '15 Avenue Farhat Hached, Gabès' },
    { firstName: 'Salma', lastName: 'Ben Amor', dateOfBirth: '1996-06-21', phone: '+216 22 555 114', email: 'salma.benamor@example.tn', insuranceProvider: 'Star', insurancePlanId: 'STAR-5691', address: null },
    { firstName: 'Khaled', lastName: 'Riahi', dateOfBirth: '1972-04-03', phone: '+216 22 555 115', email: 'khaled.riahi@example.tn', insuranceProvider: 'GAT', insurancePlanId: 'GAT-6712', address: '92 Rue de Carthage, La Marsa' },
  ];
  return repo.save(repo.create(seedData));
}

const SPECIALTIES = Object.values(Specialty);
const REFERRAL_TYPES = Object.values(ReferralType);
const SUBSTEPS_BY_STATUS: Record<ReferralStatus, string[]> = {
  [ReferralStatus.INTAKE]: ['1a', '1b', '1c', '1d', '1e'],
  [ReferralStatus.CLINICAL_PREP]: ['2a', '2b', '2c', '2d', '2e'],
  [ReferralStatus.AUTHORIZATION]: ['3a', '3b', '3c', '3d', '3e'],
  [ReferralStatus.READY_TO_SUBMIT]: ['4a', '4b', '4c', '4d', '4e'],
  [ReferralStatus.SUBMITTED]: ['5a', '5b', '5c', '5d', '5e'],
  [ReferralStatus.SCHEDULING]: ['6a', '6b', '6c', '6d', '6e'],
  [ReferralStatus.CLOSED]: ['7a', '7b', '7c', '7d', '7e'],
};

const DIAGNOSIS_CODES = ['I10', 'E11.9', 'M54.5', 'J45.909', 'R51', 'K21.9', 'G43.909', 'L70.0'];
const CLINICAL_REASONS = [
  'Persistent symptoms despite first-line therapy.',
  'Imaging findings require specialist interpretation.',
  'New onset condition needing diagnostic confirmation.',
  'Pre-operative consultation required.',
  'Follow-up after acute episode.',
  'Worsening lab values flagged on routine screening.',
  'Patient requested second opinion.',
];
const REQUESTED_PROCEDURES = [
  'Diagnostic ultrasound',
  'MRI without contrast',
  'Echocardiogram',
  'Skin biopsy',
  'Nerve conduction study',
  'Stress test',
  'Holter monitoring',
];
const APPOINTMENT_LOCATIONS = [
  'Specialty Clinic, Suite 304',
  'Hôpital Charles Nicolle, Service Cardiologie',
  'Clinique Les Berges du Lac, Étage 2',
  'Centre Médical El Manar, Bloc B',
  'Polyclinique Taoufik, Salle 12',
];
const SPECIALIST_REPORTS = [
  'Specialist evaluation complete. Treatment plan established and shared with referring provider.',
  'Imaging reviewed; findings consistent with initial differential. Conservative management recommended.',
  'Procedure performed without complications. Patient discharged with follow-up instructions.',
  'Diagnosis confirmed; therapy initiated. Re-evaluation scheduled in 6 weeks.',
];

interface ReferralBuildSpec {
  status: ReferralStatus;
  authorization?: AuthorizationStatus;
  setAppointment?: boolean;
  setCompletion?: boolean;
}

function buildPriorityPool(): ReferralPriority[] {
  const pool: ReferralPriority[] = [];
  for (let i = 0; i < 20; i++) pool.push(ReferralPriority.ROUTINE);
  for (let i = 0; i < 15; i++) pool.push(ReferralPriority.URGENT);
  for (let i = 0; i < 15; i++) pool.push(ReferralPriority.STAT);
  return shuffle(pool);
}

function buildReferralSpecs(): ReferralBuildSpec[] {
  const specs: ReferralBuildSpec[] = [];
  for (let i = 0; i < 10; i++) {
    specs.push({ status: ReferralStatus.INTAKE });
  }
  for (let i = 0; i < 8; i++) {
    specs.push({ status: ReferralStatus.CLINICAL_PREP });
  }
  for (let i = 0; i < 3; i++) {
    specs.push({
      status: ReferralStatus.AUTHORIZATION,
      authorization: AuthorizationStatus.APPROVED,
    });
  }
  for (let i = 0; i < 2; i++) {
    specs.push({
      status: ReferralStatus.AUTHORIZATION,
      authorization: AuthorizationStatus.DENIED,
    });
  }
  for (let i = 0; i < 2; i++) {
    specs.push({
      status: ReferralStatus.AUTHORIZATION,
      authorization: AuthorizationStatus.PENDING,
    });
  }
  for (let i = 0; i < 5; i++) {
    specs.push({
      status: ReferralStatus.READY_TO_SUBMIT,
      authorization: AuthorizationStatus.APPROVED,
    });
  }
  for (let i = 0; i < 7; i++) {
    specs.push({
      status: ReferralStatus.SUBMITTED,
      authorization: AuthorizationStatus.APPROVED,
    });
  }
  for (let i = 0; i < 3; i++) {
    specs.push({
      status: ReferralStatus.SCHEDULING,
      authorization: AuthorizationStatus.APPROVED,
      setAppointment: true,
    });
  }
  for (let i = 0; i < 2; i++) {
    specs.push({
      status: ReferralStatus.SCHEDULING,
      authorization: AuthorizationStatus.APPROVED,
    });
  }
  for (let i = 0; i < 8; i++) {
    specs.push({
      status: ReferralStatus.CLOSED,
      authorization: AuthorizationStatus.APPROVED,
      setAppointment: true,
      setCompletion: true,
    });
  }
  return specs;
}

async function seedReferrals(
  patients: Patient[],
  physicians: User[],
  specialist: User,
): Promise<Referral[]> {
  const repo = dataSource.getRepository(Referral);
  const specs = buildReferralSpecs();
  const priorities = buildPriorityPool();
  const substepCounters: Record<ReferralStatus, number> = {
    [ReferralStatus.INTAKE]: 0,
    [ReferralStatus.CLINICAL_PREP]: 0,
    [ReferralStatus.AUTHORIZATION]: 0,
    [ReferralStatus.READY_TO_SUBMIT]: 0,
    [ReferralStatus.SUBMITTED]: 0,
    [ReferralStatus.SCHEDULING]: 0,
    [ReferralStatus.CLOSED]: 0,
  };

  const referrals: Referral[] = [];
  for (let i = 0; i < specs.length; i++) {
    const spec = specs[i];
    const substeps = SUBSTEPS_BY_STATUS[spec.status];
    const substep =
      spec.status === ReferralStatus.CLOSED && spec.setCompletion
        ? '7e'
        : substeps[substepCounters[spec.status] % substeps.length];
    substepCounters[spec.status]++;

    const createdAt = spec.setCompletion
      ? daysAgo(randomBetween(35, 90))
      : daysAgo(randomBetween(0, 90));
    const completedAt = spec.setCompletion
      ? new Date(createdAt.getTime() + randomBetween(7, 30) * DAY_MS)
      : null;

    const specialty = SPECIALTIES[i % SPECIALTIES.length];
    const referralType = REFERRAL_TYPES[i % REFERRAL_TYPES.length];
    const priority = priorities[i];
    const patient = pick(patients);
    const referringProvider = pick(physicians);
    const assignSpecialist =
      spec.status === ReferralStatus.SUBMITTED ||
      spec.status === ReferralStatus.SCHEDULING ||
      spec.status === ReferralStatus.CLOSED;

    const referral = repo.create({
      patient,
      referringProvider,
      specialist: assignSpecialist ? specialist : null,
      referralType,
      specialty,
      priority,
      status: spec.status,
      currentSubstep: substep,
      diagnosisCode:
        spec.status === ReferralStatus.INTAKE && Math.random() < 0.4
          ? null
          : pick(DIAGNOSIS_CODES),
      clinicalReason:
        spec.status === ReferralStatus.INTAKE
          ? null
          : pick(CLINICAL_REASONS),
      requestedProcedure:
        spec.status === ReferralStatus.INTAKE
          ? null
          : pick(REQUESTED_PROCEDURES),
      authorizationStatus:
        spec.authorization ?? AuthorizationStatus.NOT_REQUIRED,
      authorizationNumber:
        spec.authorization === AuthorizationStatus.APPROVED
          ? `AUTH-2024-${100000 + i}`
          : null,
      authorizationNotes:
        spec.authorization === AuthorizationStatus.DENIED
          ? 'Denied: insufficient clinical documentation'
          : null,
      appointmentDate: spec.setAppointment
        ? spec.setCompletion
          ? new Date(createdAt.getTime() + randomBetween(5, 20) * DAY_MS)
          : new Date(Date.now() + randomBetween(1, 30) * DAY_MS)
        : null,
      appointmentLocation: spec.setAppointment ? pick(APPOINTMENT_LOCATIONS) : null,
      specialistReport: spec.setCompletion ? pick(SPECIALIST_REPORTS) : null,
      completedAt,
      createdAt,
      updatedAt: completedAt ?? createdAt,
    });

    referrals.push(referral);
  }

  return repo.save(referrals);
}

async function seedNotes(
  referrals: Referral[],
  users: User[],
): Promise<ReferralNote[]> {
  const repo = dataSource.getRepository(ReferralNote);
  const contents = [
    'Left voicemail with patient regarding scheduling.',
    'Insurance verified — coverage confirmed for procedure.',
    'Awaiting prior authorization response.',
    'Patient called to confirm appointment.',
    'Records faxed to specialist office.',
    'Follow-up scheduled for two weeks post-visit.',
    'Specialist report received and reviewed.',
    'Discussed findings with referring physician.',
    'Patient reports symptom improvement.',
    'Authorization approved with modifications — see attachment.',
    'Patient declined morning slot; rescheduled for afternoon.',
    'CNAM dossier updated with clinical justification.',
    'Lab results uploaded to patient chart.',
    'Specialist requested additional imaging.',
    'Translator arranged for next visit.',
  ];
  const notes: ReferralNote[] = [];
  for (let i = 0; i < 30; i++) {
    notes.push(
      repo.create({
        referral: pick(referrals),
        user: pick(users),
        content: pick(contents),
      }),
    );
  }
  return repo.save(notes);
}

async function seedDocuments(
  referrals: Referral[],
  users: User[],
): Promise<ReferralDocument[]> {
  const repo = dataSource.getRepository(ReferralDocument);
  const fileNames = [
    'lab-results.pdf',
    'mri-scan.png',
    'referral-form.pdf',
    'insurance-card.jpg',
    'clinical-notes.pdf',
    'authorization-letter.pdf',
    'echocardiogram-report.pdf',
    'biopsy-results.pdf',
    'patient-history.pdf',
    'consent-form.pdf',
  ];
  const fileTypes: Record<string, string> = {
    pdf: 'application/pdf',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
  };
  const documents: ReferralDocument[] = [];
  for (let i = 0; i < 10; i++) {
    const fileName = fileNames[i];
    const ext = fileName.split('.').pop() ?? 'pdf';
    const referral = pick(referrals);
    documents.push(
      repo.create({
        referral,
        uploadedBy: pick(users),
        fileName,
        filePath: `./uploads/referrals/${referral.id}/${fileName}`,
        fileType: fileTypes[ext] ?? 'application/octet-stream',
      }),
    );
  }
  return repo.save(documents);
}

async function seedStepHistory(
  referrals: Referral[],
  users: User[],
): Promise<ReferralStepHistory[]> {
  const repo = dataSource.getRepository(ReferralStepHistory);
  const pastIntake = referrals.filter(
    (r) => r.status !== ReferralStatus.INTAKE,
  );
  const transitionPairs: { from: string; to: string; fromSub: string; toSub: string }[] = [
    { from: 'intake', to: 'clinical_prep', fromSub: '1e', toSub: '2a' },
    { from: 'clinical_prep', to: 'authorization', fromSub: '2e', toSub: '3a' },
    { from: 'authorization', to: 'ready_to_submit', fromSub: '3e', toSub: '4a' },
    { from: 'ready_to_submit', to: 'submitted', fromSub: '4e', toSub: '5a' },
    { from: 'submitted', to: 'scheduling', fromSub: '5e', toSub: '6a' },
    { from: 'scheduling', to: 'closed', fromSub: '6e', toSub: '7a' },
  ];

  const candidates = shuffle(pastIntake).slice(0, 15);
  const history: ReferralStepHistory[] = [];
  for (const referral of candidates) {
    const pair = pick(transitionPairs);
    history.push(
      repo.create({
        referral: { id: referral.id } as Referral,
        fromStatus: pair.from,
        toStatus: pair.to,
        fromSubstep: pair.fromSub,
        toSubstep: pair.toSub,
        changedBy: pick(users),
        reason: 'COMPLETE_STEP',
      }),
    );
  }
  return repo.save(history);
}

async function run(): Promise<void> {
  await dataSource.initialize();
  try {
    await clear();
    const users = await seedUsers();
    const physicians = users.filter((u) => u.role === UserRole.PHYSICIAN);
    const specialist =
      users.find((u) => u.role === UserRole.SPECIALIST_STAFF) ?? users[0];
    const patients = await seedPatients();
    const referrals = await seedReferrals(patients, physicians, specialist);
    const notes = await seedNotes(referrals, users);
    const documents = await seedDocuments(referrals, users);
    const history = await seedStepHistory(referrals, users);
    console.log(
      `Seeded ${users.length} users, ${patients.length} patients, ${referrals.length} referrals, ${notes.length} notes, ${documents.length} documents, ${history.length} step-history rows.`,
    );
  } finally {
    await dataSource.destroy();
  }
}

run().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});

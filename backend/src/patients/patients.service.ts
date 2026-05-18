import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { CreatePatientDto } from './dto/create-patient.dto';
import { Patient } from './patient.entity';

// Patient CRUD + name search for the patient picker UI.
@Injectable()
export class PatientsService {
  constructor(
    @InjectRepository(Patient)
    private readonly patientsRepository: Repository<Patient>,
  ) {}

  create(dto: CreatePatientDto): Promise<Patient> {
    const patient = this.patientsRepository.create(dto);
    return this.patientsRepository.save(patient);
  }

  findAll(search?: string): Promise<Patient[]> {
    if (!search) {
      return this.patientsRepository.find({ order: { createdAt: 'DESC' } });
    }
    const term = `%${search.toLowerCase()}%`;
    return this.patientsRepository
      .createQueryBuilder('patient')
      .where(
        // Three OR-conditions match first-only, last-only, and the concatenated full name.
        new Brackets((qb) => {
          qb.where('LOWER(patient.firstName) LIKE :term', { term })
            .orWhere('LOWER(patient.lastName) LIKE :term', { term })
            .orWhere(
              "LOWER(patient.firstName || ' ' || patient.lastName) LIKE :term",
              { term },
            );
        }),
      )
      .orderBy('patient.createdAt', 'DESC')
      .getMany();
  }

  async findById(id: string): Promise<Patient> {
    const patient = await this.patientsRepository.findOne({ where: { id } });
    if (!patient) {
      throw new NotFoundException(`Patient ${id} not found`);
    }
    return patient;
  }
}

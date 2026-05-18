import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as fs from 'fs';
import { Repository } from 'typeorm';
import { AuditService } from '../../audit/audit.service';
import { VirusScannerService } from '../../common/virus-scanner.service';
import { ReferralGateway } from '../../gateway/referral.gateway';
import { User, UserRole } from '../../users/user.entity';
import { Referral } from '../referral.entity';
import { ReferralDocument } from './referral-document.entity';

export interface UploadedFile {
  originalname: string;
  mimetype: string;
  size: number;
  filename: string;
  path: string;
}

@Injectable()
export class DocumentsService {
  constructor(
    @InjectRepository(ReferralDocument)
    private readonly documentsRepository: Repository<ReferralDocument>,
    @InjectRepository(Referral)
    private readonly referralsRepository: Repository<Referral>,
    private readonly auditService: AuditService,
    private readonly virusScanner: VirusScannerService,
    private readonly referralGateway: ReferralGateway,
  ) {}

  async create(
    referralId: string,
    file: UploadedFile,
    user: User,
  ): Promise<ReferralDocument> {
    const referral = await this.referralsRepository.findOne({
      where: { id: referralId },
    });
    if (!referral) {
      // Multer already wrote the file before the controller body runs — clean it up before throwing.
      this.unlinkSilently(file.path);
      throw new NotFoundException(`Referral ${referralId} not found`);
    }

    const clean = await this.virusScanner.scanFile(file.path);
    if (!clean) {
      fs.unlinkSync(file.path);
      throw new BadRequestException('File rejected: virus detected');
    }

    const document = this.documentsRepository.create({
      referral,
      uploadedBy: user,
      fileName: file.originalname,
      filePath: file.path,
      fileType: file.mimetype,
    });
    const saved = await this.documentsRepository.save(document);

    await this.auditService.log({
      action: 'DOCUMENT_UPLOADED',
      user: { id: user.id } as User,
      referral: { id: referral.id } as Referral,
      details: {
        documentId: saved.id,
        fileName: saved.fileName,
        fileType: saved.fileType,
        size: file.size,
      },
    });

    this.referralGateway.emitReferralUpdate('referral:document-uploaded', {
      referralId,
      document: saved,
    });

    return saved;
  }

  async findAllForReferral(referralId: string): Promise<ReferralDocument[]> {
    const referral = await this.referralsRepository.findOne({
      where: { id: referralId },
    });
    if (!referral) {
      throw new NotFoundException(`Referral ${referralId} not found`);
    }
    return this.documentsRepository.find({
      where: { referral: { id: referralId } },
      relations: ['uploadedBy'],
      order: { uploadedAt: 'ASC' },
    });
  }

  async remove(
    referralId: string,
    documentId: string,
    user: User,
  ): Promise<{ deleted: true; id: string }> {
    const document = await this.documentsRepository.findOne({
      where: { id: documentId, referral: { id: referralId } },
      relations: ['uploadedBy', 'referral'],
    });
    if (!document) {
      throw new NotFoundException(`Document ${documentId} not found`);
    }

    const isUploader = document.uploadedBy?.id === user.id;
    const isAdmin = user.role === UserRole.ADMIN_STAFF;
    if (!isUploader && !isAdmin) {
      throw new ForbiddenException(
        'Only the uploader or admin staff can delete this document',
      );
    }

    this.unlinkSilently(document.filePath);
    await this.documentsRepository.remove(document);

    await this.auditService.log({
      action: 'DOCUMENT_DELETED',
      user: { id: user.id } as User,
      referral: { id: referralId } as Referral,
      details: {
        documentId,
        fileName: document.fileName,
        fileType: document.fileType,
      },
    });

    return { deleted: true, id: documentId };
  }

  private unlinkSilently(filePath: string): void {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch {
      // Best-effort cleanup — orphan files on disk are recoverable; failed deletes shouldn't break the API call.
    }
  }
}

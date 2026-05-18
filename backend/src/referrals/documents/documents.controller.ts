import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { CurrentUser } from '../../auth/current-user.decorator';
import { Roles } from '../../auth/roles.decorator';
import { User, UserRole } from '../../users/user.entity';
import {
  DocumentsService,
  UploadedFile as MulterFile,
} from './documents.service';

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg',
]);
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const UPLOADS_ROOT = './uploads/referrals';

@Controller('referrals/:id/documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Roles(UserRole.PHYSICIAN, UserRole.NURSE_PRACTITIONER, UserRole.ADMIN_STAFF)
  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        // Per-referral subdirectory keyed off :id; mkdir handles the first-upload-for-this-referral case.
        destination: (req, _file, cb) => {
          const referralId = (req.params as { id?: string }).id ?? 'unknown';
          const dir = path.join(UPLOADS_ROOT, referralId);
          fs.mkdirSync(dir, { recursive: true });
          cb(null, dir);
        },
        filename: (_req, file, cb) => {
          const ext = path.extname(file.originalname);
          cb(null, `${randomUUID()}${ext}`);
        },
      }),
      limits: { fileSize: MAX_FILE_SIZE },
      fileFilter: (_req, file, cb) => {
        if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
          cb(
            new BadRequestException(
              'Only PDF, PNG, JPG, and JPEG files are accepted',
            ),
            false,
          );
          return;
        }
        cb(null, true);
      },
    }),
  )
  upload(
    @Param('id', ParseUUIDPipe) referralId: string,
    @UploadedFile() file: MulterFile,
    @CurrentUser() user: User,
  ) {
    if (!file) {
      throw new BadRequestException('File field "file" is required');
    }
    return this.documentsService.create(referralId, file, user);
  }

  @Get()
  findAll(@Param('id', ParseUUIDPipe) referralId: string) {
    return this.documentsService.findAllForReferral(referralId);
  }

  @Delete(':docId')
  remove(
    @Param('id', ParseUUIDPipe) referralId: string,
    @Param('docId', ParseUUIDPipe) docId: string,
    @CurrentUser() user: User,
  ) {
    return this.documentsService.remove(referralId, docId, user);
  }
}

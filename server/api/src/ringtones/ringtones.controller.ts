import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { RingtonesService } from './ringtones.service';
import { UploadService } from '../upload/upload.service';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { CreateRingtoneDto } from './dto/create-ringtone.dto';
import { UpdateRingtoneDto } from './dto/update-ringtone.dto';

interface AuthenticatedRequest extends Request {
  user: { userId: string };
}

@Controller('ringtones')
@UseGuards(SupabaseAuthGuard)
export class RingtonesController {
  constructor(
    private ringtonesService: RingtonesService,
    private uploadService: UploadService,
  ) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }), // 10MB max
          new FileTypeValidator({ fileType: /(audio|video)\/(mp3|m4a|m4r|ogg|wav)/ }),
        ],
      }),
    )
    file: Express.Multer.File,
    @Request() req: AuthenticatedRequest,
    @Body() dto: { title: string; format: string; duration: string },
  ) {
    // Sauvegarder le fichier
    const fileUrl = await this.uploadService.saveFile(file, req.user.userId);

    // Créer l'enregistrement dans la base de données
    return this.ringtonesService.create(req.user.userId, {
      title: dto.title,
      format: dto.format,
      duration: parseInt(dto.duration, 10),
      sizeBytes: file.size,
      fileUrl,
    });
  }

  @Post()
  async create(@Request() req: AuthenticatedRequest, @Body() dto: CreateRingtoneDto) {
    return this.ringtonesService.create(req.user.userId, dto);
  }

  @Get()
  async findAll(@Request() req: AuthenticatedRequest) {
    return this.ringtonesService.findAll(req.user.userId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.ringtonesService.findOne(id, req.user.userId);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
    @Body() dto: UpdateRingtoneDto,
  ) {
    return this.ringtonesService.update(id, req.user.userId, dto);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    const ringtone = await this.ringtonesService.delete(id, req.user.userId);
    
    // Supprimer le fichier du système de fichiers
    if (ringtone.fileUrl) {
      await this.uploadService.deleteFile(ringtone.fileUrl);
    }
    
    return { message: 'Ringtone deleted successfully', id: ringtone.id };
  }
}

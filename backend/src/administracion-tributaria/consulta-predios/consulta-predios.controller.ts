import {
  BadRequestException,
  Body,
  Controller,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ZodError } from 'zod';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ConsultaPrediosService } from './consulta-predios.service';
import {
  SearchConsultaPrediosDto,
  SearchConsultaPrediosSchema,
} from './dto/search-consulta-predios.dto';
import { ConsultaPrediosSearchResponse } from './consulta-predios.types';

@Controller('administracion-tributaria/consulta-predios')
@UseGuards(JwtAuthGuard)
export class ConsultaPrediosController {
  constructor(private readonly service: ConsultaPrediosService) {}

  @Post('search')
  async search(@Body() body: unknown): Promise<ConsultaPrediosSearchResponse> {
    let dto: SearchConsultaPrediosDto;
    try {
      dto = SearchConsultaPrediosSchema.parse(body);
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException({
          code: 'validation_error',
          message: 'Validation failed',
          details: {
            errors: error.issues.map((issue) => ({
              path: issue.path.join('.'),
              message: issue.message,
            })),
          },
        });
      }
      throw error;
    }

    return this.service.search(dto);
  }
}

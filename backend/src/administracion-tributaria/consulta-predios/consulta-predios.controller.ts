import {
  BadRequestException,
  Body,
  Controller,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ZodError, ZodType, ZodTypeDef } from 'zod';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ConsultaPrediosService } from './consulta-predios.service';
import { SearchConsultaPrediosSchema } from './dto/search-consulta-predios.dto';
import { ExportConsultaPrediosSchema } from './dto/export-consulta-predios.dto';
import {
  ConsultaPrediosExportResponse,
  ConsultaPrediosSearchResponse,
} from './consulta-predios.types';

@Controller('administracion-tributaria/consulta-predios')
@UseGuards(JwtAuthGuard)
export class ConsultaPrediosController {
  constructor(private readonly service: ConsultaPrediosService) {}

  @Post('search')
  async search(@Body() body: unknown): Promise<ConsultaPrediosSearchResponse> {
    return this.service.search(this.parse(SearchConsultaPrediosSchema, body));
  }

  @Post('export')
  async export(@Body() body: unknown): Promise<ConsultaPrediosExportResponse> {
    return this.service.exportPredios(
      this.parse(ExportConsultaPrediosSchema, body),
    );
  }

  /** Parsea el body y traduce ZodError al envelope canónico de la API. */
  private parse<Output, Input>(
    schema: ZodType<Output, ZodTypeDef, Input>,
    body: unknown,
  ): Output {
    try {
      return schema.parse(body);
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
  }
}

import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { z } from 'zod';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CertificadoNoAdeudoService } from './certificado-no-adeudo.service';
import { SearchContribuyenteSchema } from './dto/search-contribuyente.dto';

function parse<S extends z.ZodTypeAny>(schema: S, value: unknown): z.infer<S> {
  const result = schema.safeParse(value);
  if (!result.success) {
    const detail = result.error.issues
      .map((issue) => `${issue.path.join('.') || 'body'}: ${issue.message}`)
      .join('; ');
    throw new BadRequestException(detail);
  }
  return result.data as z.infer<S>;
}

@Controller('cobranza/certificado-no-adeudo')
@UseGuards(JwtAuthGuard)
export class CertificadoNoAdeudoController {
  constructor(private readonly service: CertificadoNoAdeudoService) {}

  @Post('search')
  @HttpCode(HttpStatus.OK)
  search(@Body() body: unknown) {
    return this.service.search(parse(SearchContribuyenteSchema, body));
  }
}

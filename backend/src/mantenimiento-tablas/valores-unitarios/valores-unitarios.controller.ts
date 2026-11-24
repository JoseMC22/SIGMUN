import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { hostname } from 'os';
import { Request } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import {
  SaveValorUnitarioSchema,
  ValorUnitarioKeySchema,
} from './dto/save-valor-unitario.dto';
import { SaveValoresUnitariosBulkSchema } from './dto/save-valores-unitarios-bulk.dto';
import { SearchValoresUnitariosSchema } from './dto/search-valores-unitarios.dto';
import {
  ValoresUnitariosBulkResponse,
  ValoresUnitariosDeleteResponse,
  ValoresUnitariosMutationResponse,
  ValoresUnitariosSearchResponse,
  ValoresUnitariosYearsResponse,
} from './dto/valores-unitarios.types';
import { ValoresUnitariosService } from './valores-unitarios.service';
import { parseOrThrow } from './valores-unitarios.errors';

interface AuthRequest extends Request {
  user?: { username?: string };
}

const AUDIT_MAX_LENGTH = 50;

function audit(value: string | undefined): string {
  return (value ?? '').slice(0, AUDIT_MAX_LENGTH);
}

function station(): string {
  return audit(hostname());
}

@Controller('mantenimiento-tablas/valores-unitarios')
@UseGuards(JwtAuthGuard)
export class ValoresUnitariosController {
  constructor(private readonly service: ValoresUnitariosService) {}

  @Get('years')
  async years(): Promise<ValoresUnitariosYearsResponse> {
    return this.service.years();
  }

  @Get()
  async search(
    @Query() query: Record<string, unknown>,
  ): Promise<ValoresUnitariosSearchResponse> {
    return this.service.search(parseOrThrow(SearchValoresUnitariosSchema, query));
  }

  /** Declarada antes de `@Post()` para que `/bulk` no caiga en la ruta base. */
  @Post('bulk')
  async bulk(
    @Body() body: unknown,
    @Req() req: AuthRequest,
  ): Promise<ValoresUnitariosBulkResponse> {
    return this.service.upsertMany(
      parseOrThrow(SaveValoresUnitariosBulkSchema, body),
      audit(req.user?.username),
      station(),
    );
  }

  @Post()
  async create(
    @Body() body: unknown,
    @Req() req: AuthRequest,
  ): Promise<ValoresUnitariosMutationResponse> {
    return this.service.create(
      parseOrThrow(SaveValorUnitarioSchema, body),
      audit(req.user?.username),
      station(),
    );
  }

  @Put()
  async update(
    @Body() body: unknown,
    @Req() req: AuthRequest,
  ): Promise<ValoresUnitariosMutationResponse> {
    return this.service.update(
      parseOrThrow(SaveValorUnitarioSchema, body),
      audit(req.user?.username),
      station(),
    );
  }

  @Delete(':region/:anno/:codi')
  async remove(
    @Param() params: Record<string, string>,
  ): Promise<ValoresUnitariosDeleteResponse> {
    const key = parseOrThrow(ValorUnitarioKeySchema, params);
    return this.service.remove(key.region, key.anno, key.codi);
  }
}

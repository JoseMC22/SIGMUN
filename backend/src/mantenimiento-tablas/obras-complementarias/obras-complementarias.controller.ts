import {
  Body,
  Controller,
  Delete,
  Get,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { hostname } from 'os';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import {
  CopyYearObrasComplementariasSchema,
  CreateObraComplementariaSchema,
  DeleteObraComplementariaSchema,
  SearchObrasComplementariasSchema,
  UpdateObraComplementariaSchema,
} from './dto/obras-complementarias.dto';
import {
  ObrasComplementariasCopyYearResponse,
  ObrasComplementariasDeleteResponse,
  ObrasComplementariasMutationResponse,
  ObrasComplementariasSearchResponse,
  ObrasComplementariasYearsResponse,
} from './dto/obras-complementarias.types';
import { parseOrThrow } from './obras-complementarias.errors';
import { ObrasComplementariasService } from './obras-complementarias.service';

interface AuthRequest extends Request {
  user?: { username?: string };
}

const AUDIT_MAX_LENGTH = 25;

function audit(value: string | undefined): string {
  return (value ?? '').slice(0, AUDIT_MAX_LENGTH);
}

@Controller('mantenimiento-tablas/obras-complementarias')
@UseGuards(JwtAuthGuard)
export class ObrasComplementariasController {
  constructor(private readonly service: ObrasComplementariasService) {}

  @Get('years')
  async years(): Promise<ObrasComplementariasYearsResponse> {
    return this.service.years();
  }

  @Get()
  async search(
    @Query() query: Record<string, unknown>,
  ): Promise<ObrasComplementariasSearchResponse> {
    return this.service.search(
      parseOrThrow(SearchObrasComplementariasSchema, query),
    );
  }

  @Post()
  async create(
    @Body() body: unknown,
    @Req() req: AuthRequest,
  ): Promise<ObrasComplementariasMutationResponse> {
    return this.service.create(
      parseOrThrow(CreateObraComplementariaSchema, body),
      audit(req.user?.username),
      audit(hostname()),
    );
  }

  @Put()
  async update(
    @Body() body: unknown,
    @Req() req: AuthRequest,
  ): Promise<ObrasComplementariasMutationResponse> {
    return this.service.update(
      parseOrThrow(UpdateObraComplementariaSchema, body),
      audit(req.user?.username),
      audit(hostname()),
    );
  }

  @Delete()
  async remove(
    @Body() body: unknown,
    @Req() req: AuthRequest,
  ): Promise<ObrasComplementariasDeleteResponse> {
    const { key } = parseOrThrow(DeleteObraComplementariaSchema, body);
    return this.service.remove(
      key,
      audit(req.user?.username),
      audit(hostname()),
    );
  }

  @Post('copy-year')
  async copyYear(
    @Body() body: unknown,
    @Req() req: AuthRequest,
  ): Promise<ObrasComplementariasCopyYearResponse> {
    return this.service.copyYear(
      parseOrThrow(CopyYearObrasComplementariasSchema, body),
      audit(req.user?.username),
      audit(hostname()),
    );
  }
}

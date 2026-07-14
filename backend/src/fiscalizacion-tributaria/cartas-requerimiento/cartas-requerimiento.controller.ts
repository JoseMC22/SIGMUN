import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CartasRequerimientoService } from './cartas-requerimiento.service';
import {
  SearchCartasRequerimientoSchema,
  SearchCartasRequerimientoDto,
  GetContribuyenteSchema,
  GetContribuyenteDto,
  SearchCartasSchema,
  SearchCartasDto,
  GetCartaReqPrediosSchema,
  GetCartaReqPrediosDto,
  GetFiscalizadoresSchema,
  GetFiscalizadoresDto,
  GetCartaByIdSchema,
  GetCartaByIdDto,
} from './dto/search-cartas-requerimiento.dto';
import {
  CartasRequerimientoRow,
  ContribuyenteInfo,
  CartaRequerimientoItem,
  PaginatedResponse,
  TAAnioOption,
  MotivoOption,
  CartaReqPredio,
  Fiscalizador,
  CartaById,
} from './cartas-requerimiento.types';

@Controller('fiscalizacion-tributaria/cartas-requerimiento')
@UseGuards(JwtAuthGuard)
export class CartasRequerimientoController {
  constructor(private readonly service: CartasRequerimientoService) {}

  @Post('search')
  async search(@Body() dto: SearchCartasRequerimientoDto): Promise<PaginatedResponse<CartasRequerimientoRow>> {
    const parsed = SearchCartasRequerimientoSchema.parse(dto);
    return this.service.search(parsed);
  }

  @Post('contribuyente')
  async getContribuyente(@Body() dto: GetContribuyenteDto): Promise<ContribuyenteInfo | null> {
    const parsed = GetContribuyenteSchema.parse(dto);
    return this.service.getContribuyente(parsed.codigo);
  }

  @Post('cartas')
  async searchCartas(@Body() dto: SearchCartasDto): Promise<PaginatedResponse<CartaRequerimientoItem>> {
    const parsed = SearchCartasSchema.parse(dto);
    return this.service.searchCartas(parsed.codigo, parsed.page, parsed.pageSize);
  }

  @Post('t-anio')
  async getTAAnio(): Promise<TAAnioOption[]> {
    return this.service.getTAAnio();
  }

  @Post('motivo')
  async getMotivo(): Promise<MotivoOption[]> {
    return this.service.getMotivo();
  }

  @Post('carta-req-predios')
  async getCartaReqPredios(@Body() dto: GetCartaReqPrediosDto): Promise<CartaReqPredio[]> {
    const parsed = GetCartaReqPrediosSchema.parse(dto);
    return this.service.getCartaReqPredios(parsed.codigo, parsed.anno, parsed.idCarta);
  }

  @Post('carta-by-id')
  async getCartaById(@Body() dto: GetCartaByIdDto): Promise<CartaById | null> {
    const parsed = GetCartaByIdSchema.parse(dto);
    return this.service.getCartaById(parsed.idCarta);
  }

  @Post('fiscalizadores')
  async getFiscalizadores(@Body() dto: GetFiscalizadoresDto): Promise<Fiscalizador[]> {
    const parsed = GetFiscalizadoresSchema.parse(dto);
    return this.service.getFiscalizadores(parsed.idCarta);
  }
}

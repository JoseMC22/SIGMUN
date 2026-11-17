import {
  BadRequestException,
  Body,
  Controller,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ZodError, ZodType, ZodTypeDef } from 'zod';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { EstadoCuentaProyectadoService } from './estado-cuenta-proyectado.service';
import { SearchContribuyentesProyectadosSchema } from './dto/search-contribuyentes-proyectado.dto';
import { EstadoCuentaProyectadoSearchResponse } from './estado-cuenta-proyectado.types';

@Controller('administracion-tributaria/estado-cuenta-proyectado')
@UseGuards(JwtAuthGuard)
export class EstadoCuentaProyectadoController {
  constructor(private readonly service: EstadoCuentaProyectadoService) {}

  @Post('contribuyentes')
  async search(
    @Body() body: unknown,
  ): Promise<EstadoCuentaProyectadoSearchResponse> {
    return this.service.search(this.parse(SearchContribuyentesProyectadosSchema, body));
  }

  /** Parses the body and translates ZodError into the canonical API envelope. */
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

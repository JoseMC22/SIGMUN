import { Controller, Get, Param, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ImpresionDjAlcabalaService } from './impresion-dj-alcabala.service';
import { generateOpPdf } from './op-pdf-generator';

@Controller('alcabala/impresion-dj-alcabala')
@UseGuards(JwtAuthGuard)
export class ImpresionDjAlcabalaController {
  constructor(
    private readonly impresionDjAlcabalaService: ImpresionDjAlcabalaService,
  ) {}

  @Get('op-pdf/:idAlcabala')
  async getOpPdf(
    @Param('idAlcabala') idAlcabala: string,
    @Res() res: Response,
  ) {
    const { numVal, anoVal, rows } =
      await this.impresionDjAlcabalaService.resolveOpPrintData(
        Number(idAlcabala),
      );
    const buffer = await generateOpPdf(rows);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="op_${numVal}_${anoVal}.pdf"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }
}

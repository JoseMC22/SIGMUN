import { Controller, Get, Param, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ObjectAccessService } from './object-access.service';
import { ObjectAccessResponse } from './dto/object-access.types';

@Controller('seguridad/object-access')
@UseGuards(JwtAuthGuard)
export class ObjectAccessController {
  constructor(private readonly objectAccessService: ObjectAccessService) {}

  @Get(':id_acceso')
  async getPermissions(
    @Param('id_acceso') id_acceso: number,
    @Request() req: any,
  ): Promise<ObjectAccessResponse> {
    const username: string = req.user?.username ?? req.user?.sub;
    const objects = await this.objectAccessService.getPermissions(
      username,
      id_acceso,
    );
    return { id_acceso, objects };
  }
}

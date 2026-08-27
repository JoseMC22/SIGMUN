import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  Sse,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { MessageEvent } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ObjectAccessService } from './object-access.service';
import { ObjectAccessSubscriber } from './object-access.subscriber';
import { ObjectAccessResponse } from './dto/object-access.types';

@Controller('seguridad/object-access')
@UseGuards(JwtAuthGuard)
export class ObjectAccessController {
  constructor(
    private readonly objectAccessService: ObjectAccessService,
    private readonly subscriber: ObjectAccessSubscriber,
  ) {}

  @Get(':id_acceso')
  async getPermissions(
    @Param('id_acceso') id_acceso: string | number,
    @Request() req: any,
  ): Promise<ObjectAccessResponse> {
    const username: string = req.user?.username ?? req.user?.sub;
    const objects = await this.objectAccessService.getPermissions(
      username,
      id_acceso,
    );
    return { id_acceso, objects };
  }

  @Sse('events')
  events(@Request() req: any): Observable<MessageEvent> {
    const username: string = req.user?.username ?? req.user?.sub;
    return this.subscriber.getObservable(username);
  }

  @Post('invalidate')
  async invalidate(
    @Body() body: { id_acceso: string | number; usernames: string[] },
  ): Promise<{ success: boolean }> {
    await this.objectAccessService.invalidateAndNotify(
      body.id_acceso,
      body.usernames,
    );
    return { success: true };
  }
}

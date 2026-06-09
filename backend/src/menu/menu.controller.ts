import {
  Controller,
  Get,
  Param,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtPayload } from '../auth/dto/auth.dto';
import { MenuService } from './menu.service';

@UseGuards(JwtAuthGuard)
@Controller('menu')
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  @Get('modules')
  async getModules(@Request() req: { user: JwtPayload }) {
    const modules = await this.menuService.getModules(req.user.username);
    return { modules };
  }

  @Get('modules/:id/submenus')
  async getSubmenus(
    @Param('id') moduleId: string,
    @Request() req: { user: JwtPayload },
  ) {
    const submenus = await this.menuService.getSubmenus(
      moduleId,
      req.user.username,
    );
    return { submenus };
  }

  @Get('all')
  async getAllAccessiblePaths(@Request() req: { user: JwtPayload }) {
    const paths = await this.menuService.getAllAccessiblePaths(
      req.user.username,
    );
    return { paths };
  }
}

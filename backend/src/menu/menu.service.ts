import { Injectable, Logger, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { DatabaseService } from '../database/database.service';
import {
  SpMenuModuleResult,
  SpMenuSubmoduleResult,
  MenuModuleResponse,
  MenuSubmenuResponse,
} from './dto/menu.dto';

const MENU_CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutos

@Injectable()
export class MenuService {
  private readonly logger = new Logger(MenuService.name);

  constructor(
    private readonly db: DatabaseService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async getModules(vlogin: string): Promise<MenuModuleResponse[]> {
    const cacheKey = `menu:modules:${vlogin}`;

    const cached = await this.cacheManager.get<MenuModuleResponse[]>(cacheKey);
    if (cached) return cached;

    try {
      const result = await this.db.executeProcedure<SpMenuModuleResult>(
        '[Acceso].[sp_LogOut]',
        { buscar: 4, parametro: vlogin },
      );

      const records = result.recordset ?? [];
      const modules = records.map((row) => ({
        id: row.id_acceso.trim(),
        title: row.nombre.trim(),
      }));

      await this.cacheManager.set(cacheKey, modules, MENU_CACHE_TTL_MS);
      return modules;
    } catch (error) {
      this.logger.error(`Error al obtener módulos para ${vlogin}`, error);
      throw error;
    }
  }

  async getSubmenus(moduleId: string, vlogin: string): Promise<MenuSubmenuResponse[]> {
    const cacheKey = `menu:submenus:${vlogin}:${moduleId}`;

    const cached = await this.cacheManager.get<MenuSubmenuResponse[]>(cacheKey);
    if (cached) return cached;

    try {
      const result = await this.db.executeProcedure<SpMenuSubmoduleResult>(
        '[Acceso].[sp_LogOut]',
        { buscar: 8, parametro: moduleId, password: vlogin },
      );

      const records = result.recordset ?? [];
      const submenus = records.map((row) => ({
        id: row.id_acceso.trim(),
        title: row.nombre.trim(),
        path: row.doform2?.trim() ?? '',
        icon: row.icono?.trim() ?? '',
        form: row.formulario?.trim() ?? '',
      }));

      await this.cacheManager.set(cacheKey, submenus, MENU_CACHE_TTL_MS);
      return submenus;
    } catch (error) {
      this.logger.error(
        `Error al obtener submenús del módulo ${moduleId} para ${vlogin}`,
        error,
      );
      throw error;
    }
  }

  async getAllAccessiblePaths(vlogin: string): Promise<string[]> {
    const cacheKey = `menu:paths:${vlogin}`;

    const cached = await this.cacheManager.get<string[]>(cacheKey);
    if (cached) return cached;

    try {
      const modules = await this.getModules(vlogin);

      const results = await Promise.all(
        modules.map((mod) => this.getSubmenus(mod.id, vlogin)),
      );

      const paths = results.flat().map((sub) => sub.path).filter(Boolean);

      await this.cacheManager.set(cacheKey, paths, MENU_CACHE_TTL_MS);
      return paths;
    } catch (error) {
      this.logger.error(`Error al obtener paths accesibles para ${vlogin}`, error);
      throw error;
    }
  }
}

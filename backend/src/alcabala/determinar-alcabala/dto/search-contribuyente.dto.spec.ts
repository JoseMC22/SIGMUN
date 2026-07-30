/// <reference types="jest" />

import { SearchContribuyenteSchema } from './search-contribuyente.dto';

describe('SearchContribuyenteDto', () => {
  describe('SearchContribuyenteSchema', () => {
    it('should validate a valid query with all fields', () => {
      const query = {
        tipoBusqueda: 'C',
        busqueda: '12345',
        page: '2',
        pageSize: '20',
      };
      const result = SearchContribuyenteSchema.safeParse(query);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.tipoBusqueda).toBe('C');
        expect(result.data.busqueda).toBe('12345');
        expect(result.data.page).toBe(2);
        expect(result.data.pageSize).toBe(20);
      }
    });

    it('should default tipoBusqueda to C when missing', () => {
      const query = { busqueda: 'test' };
      const result = SearchContribuyenteSchema.safeParse(query);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.tipoBusqueda).toBe('C');
      }
    });

    it('should default busqueda to empty string when missing', () => {
      const query = { tipoBusqueda: 'N' };
      const result = SearchContribuyenteSchema.safeParse(query);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.busqueda).toBe('');
      }
    });

    it('should default page to 1 when missing', () => {
      const query = { tipoBusqueda: 'R', busqueda: 'test' };
      const result = SearchContribuyenteSchema.safeParse(query);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
      }
    });

    it('should default pageSize to 15 when missing', () => {
      const query = { tipoBusqueda: 'D', busqueda: '123' };
      const result = SearchContribuyenteSchema.safeParse(query);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.pageSize).toBe(15);
      }
    });

    it('should coerce page string to number', () => {
      const query = { tipoBusqueda: 'C', busqueda: '123', page: '3' };
      const result = SearchContribuyenteSchema.safeParse(query);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(3);
        expect(typeof result.data.page).toBe('number');
      }
    });

    it('should coerce pageSize string to number', () => {
      const query = { tipoBusqueda: 'C', busqueda: '123', pageSize: '25' };
      const result = SearchContribuyenteSchema.safeParse(query);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.pageSize).toBe(25);
        expect(typeof result.data.pageSize).toBe('number');
      }
    });

    it('should reject invalid tipoBusqueda', () => {
      const query = { tipoBusqueda: 'X', busqueda: 'test' };
      const result = SearchContribuyenteSchema.safeParse(query);
      expect(result.success).toBe(false);
    });

    it('should reject page less than 1', () => {
      const query = { tipoBusqueda: 'C', busqueda: '123', page: '0' };
      const result = SearchContribuyenteSchema.safeParse(query);
      expect(result.success).toBe(false);
    });

    it('should reject pageSize less than 1', () => {
      const query = { tipoBusqueda: 'C', busqueda: '123', pageSize: '0' };
      const result = SearchContribuyenteSchema.safeParse(query);
      expect(result.success).toBe(false);
    });

    it('should accept all valid tipoBusqueda values', () => {
      const validTypes = ['C', 'N', 'R', 'D', 'P', 'V'];
      for (const tipo of validTypes) {
        const query = { tipoBusqueda: tipo, busqueda: 'test' };
        const result = SearchContribuyenteSchema.safeParse(query);
        expect(result.success).toBe(true);
      }
    });

    it('should trim whitespace from busqueda? (no, Zod does not trim by default)', () => {
      const query = { tipoBusqueda: 'C', busqueda: '  123  ' };
      const result = SearchContribuyenteSchema.safeParse(query);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.busqueda).toBe('  123  ');
      }
    });
  });
});
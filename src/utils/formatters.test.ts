import { describe, it, expect } from 'vitest';
import { formatCompetenciaExtenso } from './formatters';

describe('formatCompetenciaExtenso', () => {
  it('formata a competência como "Mês/AAAA" por extenso', () => {
    expect(formatCompetenciaExtenso('2026-09-01')).toBe('Setembro/2026');
    expect(formatCompetenciaExtenso('2026-03-01')).toBe('Março/2026');
    expect(formatCompetenciaExtenso('2025-12-01')).toBe('Dezembro/2025');
  });

  it('devolve o valor original quando não é uma competência válida', () => {
    expect(formatCompetenciaExtenso('invalido')).toBe('invalido');
    expect(formatCompetenciaExtenso('2026-13-01')).toBe('2026-13-01');
  });
});

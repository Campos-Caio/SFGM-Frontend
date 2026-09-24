import { describe, it, expect } from 'vitest';
import {
  businessDateFromTimestamp,
  businessHour,
  currentCompetencia,
  currentMonthInput,
  formatDateTimeBr,
  todayBusinessDate,
} from './businessTime';

// 2026-09-01T02:30Z = 31/08/2026 22:30 em MS (UTC-4): ainda é agosto lá.
const APOS_MEIA_NOITE_UTC = new Date('2026-09-01T02:30:00Z');
// 2026-09-01T04:00Z = 01/09/2026 00:00 em MS: virou setembro.
const MEIA_NOITE_MS = new Date('2026-09-01T04:00:00Z');

describe('businessTime (fuso America/Campo_Grande)', () => {
  it('usa o dia de MS mesmo quando o UTC já virou o dia', () => {
    expect(todayBusinessDate(APOS_MEIA_NOITE_UTC)).toBe('2026-08-31');
    expect(todayBusinessDate(MEIA_NOITE_MS)).toBe('2026-09-01');
  });

  it('usa o mês/competência de MS na virada de mês', () => {
    expect(currentMonthInput(APOS_MEIA_NOITE_UTC)).toBe('2026-08');
    expect(currentCompetencia(APOS_MEIA_NOITE_UTC)).toBe('2026-08-01');
    expect(currentMonthInput(MEIA_NOITE_MS)).toBe('2026-09');
    expect(currentCompetencia(MEIA_NOITE_MS)).toBe('2026-09-01');
  });

  it('usa a hora de MS (0-23, sem "24" à meia-noite)', () => {
    expect(businessHour(APOS_MEIA_NOITE_UTC)).toBe(22);
    expect(businessHour(MEIA_NOITE_MS)).toBe(0);
  });

  it('formata um timestamp com offset no fuso de MS', () => {
    expect(formatDateTimeBr('2026-09-21T02:30:00+00:00')).toBe('20/09/2026 22:30');
    expect(formatDateTimeBr('2026-09-21T02:30:00Z')).toBe('20/09/2026 22:30');
    expect(formatDateTimeBr('2026-09-20T22:30:00-04:00')).toBe('20/09/2026 22:30');
  });

  it('não adivinha o fuso de um timestamp sem offset', () => {
    expect(formatDateTimeBr('2026-09-21T02:30:00')).toBe('2026-09-21T02:30:00');
    expect(businessDateFromTimestamp('2026-09-21T02:30:00')).toBeNull();
  });

  it('converte um timestamp para a data de negócio em MS', () => {
    expect(businessDateFromTimestamp('2026-09-21T02:30:00+00:00')).toBe('2026-09-20');
    expect(businessDateFromTimestamp('2026-09-21T12:00:00Z')).toBe('2026-09-21');
  });
});

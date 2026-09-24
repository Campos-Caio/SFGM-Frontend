/**
 * Fuso horário de negócio do sistema: Mato Grosso do Sul (America/Campo_Grande,
 * UTC-4). O backend aplica esse fuso em todo "hoje"/"agora"; o frontend deve
 * usar SEMPRE estas funções (nunca `new Date().getFullYear()/getMonth()/
 * getHours()`), para não depender do fuso do navegador.
 *
 * Armadilhas a evitar:
 * - `new Date("YYYY-MM-DD")` interpreta a string como UTC e, em UTC-4, exibe o
 *   dia anterior. Datas "date-only" (data, competencia, data_pagamento) são
 *   tratadas só como string (ver utils/formatters.ts), nunca via `Date`.
 * - Timestamps (ex.: `pago_em`) são instantes UTC: não compare com datas
 *   locais; converta para o fuso de negócio com as funções abaixo.
 */

export const BUSINESS_TIME_ZONE = 'America/Campo_Grande';

// `hourCycle: 'h23'` evita a hora "24" à meia-noite em alguns ambientes.
const partsFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: BUSINESS_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

interface BusinessParts {
  year: string;
  month: string;
  day: string;
  hour: string;
  minute: string;
}

function businessParts(date: Date): BusinessParts {
  const parts: Record<string, string> = {};
  for (const part of partsFormatter.formatToParts(date)) {
    parts[part.type] = part.value;
  }
  return {
    year: parts.year,
    month: parts.month,
    day: parts.day,
    hour: parts.hour,
    minute: parts.minute,
  };
}

/** Data de hoje no fuso de MS, no formato "YYYY-MM-DD". */
export function todayBusinessDate(now: Date = new Date()): string {
  const { year, month, day } = businessParts(now);
  return `${year}-${month}-${day}`;
}

/** Mês atual no fuso de MS, no formato de <input type="month"> ("YYYY-MM"). */
export function currentMonthInput(now: Date = new Date()): string {
  const { year, month } = businessParts(now);
  return `${year}-${month}`;
}

/** Competência atual no fuso de MS, no formato da API ("YYYY-MM-01"). */
export function currentCompetencia(now: Date = new Date()): string {
  return `${currentMonthInput(now)}-01`;
}

/** Hora atual (0-23) no fuso de MS. */
export function businessHour(now: Date = new Date()): number {
  return Number(businessParts(now).hour);
}

// Um timestamp só é inequívoco se trouxer "Z" ou offset; sem isso o
// navegador o interpretaria no fuso local.
const HAS_OFFSET = /(Z|[+-]\d{2}:?\d{2})$/i;

function parseTimestamp(iso: string): Date | null {
  if (!HAS_OFFSET.test(iso)) return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Formata um timestamp da API (ex.: `pago_em`) como "DD/MM/AAAA HH:mm" no
 * fuso de MS. Se o valor não for um timestamp com offset, devolve a string
 * original em vez de adivinhar o fuso.
 */
export function formatDateTimeBr(iso: string): string {
  const date = parseTimestamp(iso);
  if (!date) return iso;
  const { year, month, day, hour, minute } = businessParts(date);
  return `${day}/${month}/${year} ${hour}:${minute}`;
}

/**
 * Data ("YYYY-MM-DD") em que um timestamp da API ocorreu no fuso de MS, ou
 * `null` se o valor não for um timestamp com offset.
 */
export function businessDateFromTimestamp(iso: string): string | null {
  const date = parseTimestamp(iso);
  return date ? todayBusinessDate(date) : null;
}

/**
 * Formatação de apresentação (string in/out), equivalente aos filtros Jinja
 * de backend/src/web/template_filters.py. Não recalcula nem valida nenhum
 * valor financeiro — apenas formata para exibição.
 */

const moedaFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

/**
 * Formata um valor monetário (a API envia Decimal serializado como string,
 * ex. "100.00") no padrão pt-BR. Ex.: "100.00" -> "R$ 100,00";
 * "-1500" -> "-R$ 1.500,00".
 */
export function formatCurrency(valor: string | number | null | undefined): string {
  if (valor === null || valor === undefined || valor === '') {
    return moedaFormatter.format(0);
  }
  const numero = typeof valor === 'number' ? valor : Number(valor);
  if (Number.isNaN(numero)) {
    return moedaFormatter.format(0);
  }
  return moedaFormatter.format(numero);
}

/**
 * Formata uma competência (date "YYYY-MM-DD", sempre dia 1) como "MM/AAAA".
 */
export function formatMesAno(competencia: string): string {
  const [ano, mes] = competencia.split('-');
  if (!ano || !mes) return competencia;
  return `${mes}/${ano}`;
}

const MESES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

/**
 * Formata uma competência (date "YYYY-MM-DD") como "Mês/AAAA" por extenso.
 * Ex.: "2026-09-01" -> "Setembro/2026". Usa apenas a string (sem `Date`),
 * portanto não sofre deslocamento de fuso horário.
 */
export function formatCompetenciaExtenso(competencia: string): string {
  const [ano, mes] = competencia.split('-');
  const nome = MESES[Number(mes) - 1];
  if (!ano || !nome) return competencia;
  return `${nome}/${ano}`;
}

/**
 * Formata uma data (date "YYYY-MM-DD") como "DD/MM/AAAA".
 */
export function formatDataBr(data: string): string {
  const [ano, mes, dia] = data.split('-');
  if (!ano || !mes || !dia) return data;
  return `${dia}/${mes}/${ano}`;
}

/**
 * Converte o valor de um <input type="month"> ("YYYY-MM") para o formato de
 * competência esperado pela API ("YYYY-MM-01").
 */
export function monthInputToCompetencia(monthValue: string): string {
  return `${monthValue}-01`;
}

/**
 * Converte uma competência da API ("YYYY-MM-01" ou "YYYY-MM-DD") para o
 * valor esperado por um <input type="month"> ("YYYY-MM").
 */
export function competenciaToMonthInput(competencia: string): string {
  return competencia.slice(0, 7);
}

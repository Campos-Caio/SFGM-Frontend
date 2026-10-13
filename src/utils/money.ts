import { formatCurrency } from './formatters';

/**
 * Soma valores monetários (Decimal serializado como string, ex. "100.00")
 * em centavos inteiros, evitando erro de ponto flutuante. Uso apenas para
 * exibição (prévia/totais informativos); o servidor é a fonte de verdade.
 * Retorna o total como string com 2 casas (ex. "130.50").
 */
export function somarValores(valores: string[]): string {
  const centavos = valores.reduce((acc, valor) => {
    const numero = Number(valor);
    return Number.isNaN(numero) ? acc : acc + Math.round(numero * 100);
  }, 0);
  return (centavos / 100).toFixed(2);
}

/** Limite da coluna `Numeric(12, 2)` do backend (em módulo). */
export const SALDO_INICIAL_LIMITE = 9999999999.99;
/** Número com sinal opcional e no máximo 2 casas decimais (formato da API). */
const SALDO_FORMATO = /^-?\d+(\.\d{1,2})?$/;

/**
 * Validação local do saldo inicial (o servidor revalida e é a fonte de
 * verdade). Zero e negativo são permitidos. Retorna a mensagem de erro ou
 * `null` se o valor for aceitável.
 */
export function validarSaldoInicial(valor: string): string | null {
  const texto = valor.trim();
  if (!texto) return 'Informe o saldo inicial.';
  if (!SALDO_FORMATO.test(texto)) return 'Informe um valor com no máximo 2 casas decimais.';
  if (Math.abs(Number(texto)) > SALDO_INICIAL_LIMITE) {
    return 'O valor deve estar entre -9.999.999.999,99 e 9.999.999.999,99.';
  }
  return null;
}

/**
 * Converte um valor monetário (Decimal como string, ex. "123.45") em centavos
 * inteiros (12345), para comparar valores sem erro de ponto flutuante. Valor
 * inválido conta como 0. Uso apenas na interface; o servidor é a fonte de verdade.
 */
export function paraCentavos(valor: string): number {
  const numero = Number(valor);
  return Number.isNaN(numero) ? 0 : Math.round(numero * 100);
}

/**
 * Compara dois valores monetários em centavos: negativo se `a < b`, zero se
 * iguais e positivo se `a > b` (ex.: crédito disponível x valor em aberto).
 */
export function compararValores(a: string, b: string): number {
  return paraCentavos(a) - paraCentavos(b);
}

/** Valor absoluto, com 2 casas (ex. "-150.5" -> "150.50"). */
export function valorAbsoluto(valor: string): string {
  return (Math.abs(paraCentavos(valor)) / 100).toFixed(2);
}

/**
 * Rótulo do saldo do irmão sem sinal cru: negativo = "Deve R$ X", positivo =
 * "Crédito de R$ X", zero = "Em dia".
 */
export function rotuloSaldo(saldo: string): string {
  const centavos = paraCentavos(saldo);
  if (centavos < 0) return `Deve ${formatCurrency(valorAbsoluto(saldo))}`;
  if (centavos > 0) return `Crédito de ${formatCurrency(saldo)}`;
  return 'Em dia';
}

/** Valor positivo com no máximo 2 casas decimais (sem sinal). */
const VALOR_POSITIVO_FORMATO = /^\d+(\.\d{1,2})?$/;

/**
 * Validação local de um valor monetário obrigatório e maior que zero (ex.:
 * crédito adiantado), no limite da coluna `Numeric(12, 2)`. O servidor
 * revalida. Retorna a mensagem de erro ou `null` se o valor for aceitável.
 */
export function validarValorPositivo(valor: string): string | null {
  const texto = valor.trim();
  if (!texto) return 'Informe o valor.';
  if (!VALOR_POSITIVO_FORMATO.test(texto)) return 'Informe um valor com no máximo 2 casas decimais.';
  if (paraCentavos(texto) <= 0) return 'O valor deve ser maior que zero.';
  if (Number(texto) > SALDO_INICIAL_LIMITE) return 'O valor deve ser no máximo 9.999.999.999,99.';
  return null;
}

/** Diferença `a - b` calculada em centavos, com 2 casas (ex.: crédito que resta após o uso). */
export function subtrairValores(a: string, b: string): string {
  return ((paraCentavos(a) - paraCentavos(b)) / 100).toFixed(2);
}

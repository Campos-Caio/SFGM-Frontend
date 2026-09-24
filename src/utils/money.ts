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

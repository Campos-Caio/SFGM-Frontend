/**
 * Caixa (conta única) da Loja — visão derivada calculada pelo backend a cada
 * leitura: `saldo_atual = saldo_inicial + total_receitas - total_despesas`
 * somando TODOS os lançamentos da loja. Valores são Decimal serializados como
 * string (ex. "100.00"); `saldo_atual` pode ser negativo.
 */
export interface Caixa {
  loja_id: number;
  saldo_inicial: string;
  total_receitas: string;
  total_despesas: string;
  saldo_atual: string;
}

/** Payload de `PUT /lojas/{loja_id}/caixa/saldo-inicial` (zero e negativo são aceitos). */
export interface SaldoInicialInput {
  saldo_inicial: string;
}

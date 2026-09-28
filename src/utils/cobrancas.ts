import { FORMA_PAGAMENTO_LABELS, type DebitosPorCompetencia } from '../types/debito';
import { businessDateFromTimestamp, formatDateTimeBr } from './businessTime';
import { formatDataBr } from './formatters';

/**
 * Texto da baixa de uma cobrança paga: "Pago em DD/MM/AAAA · Forma". Usa a data
 * efetiva do pagamento (`data_pagamento`, date-only, fuso de MS). Se a cobrança
 * tiver mais de uma data (dados legados), usa a mais recente; se `data_pagamento`
 * faltar, deriva do timestamp `pago_em` convertido para o fuso de MS.
 * Retorna `null` se nenhum débito da cobrança estiver pago.
 */
export function pagamentoInfo(
  c: DebitosPorCompetencia
): { texto: string; registradoEm?: string } | null {
  let ref: DebitosPorCompetencia['debitos'][number] | null = null;
  let refData: string | null = null;
  for (const d of c.debitos) {
    if (d.situacao !== 'PAGO') continue;
    const data = d.data_pagamento ?? (d.pago_em ? businessDateFromTimestamp(d.pago_em) : null);
    if (ref === null || (data !== null && (refData === null || data > refData))) {
      ref = d;
      refData = data;
    }
  }
  if (ref === null) return null;

  const partes: string[] = [];
  if (refData) partes.push(`Pago em ${formatDataBr(refData)}`);
  else if (ref.pago_em) partes.push(`Pago em ${formatDateTimeBr(ref.pago_em)}`);
  else partes.push('Pago');
  if (ref.forma_pagamento) partes.push(FORMA_PAGAMENTO_LABELS[ref.forma_pagamento]);
  return {
    texto: partes.join(' · '),
    registradoEm: ref.pago_em ? formatDateTimeBr(ref.pago_em) : undefined,
  };
}

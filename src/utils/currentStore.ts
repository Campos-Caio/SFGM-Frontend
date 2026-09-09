import { lojaApi } from '../api/loja';
import type { Loja } from '../types/loja';

/**
 * Abstração de "loja atual". O sistema não tem multi-loja de verdade nesta
 * fase — a UI sempre opera sobre a primeira loja cadastrada (mesma
 * convenção usada pelas rotas Jinja administrativas, ver
 * backend/src/web/routers/*.py `_get_primeira_loja`).
 *
 * Ponto único de acesso para que, quando o sistema evoluir para múltiplas
 * lojas com seletor, apenas este arquivo precise mudar.
 */
export async function getCurrentStore(): Promise<Loja | null> {
  const lojas = await lojaApi.list();
  return lojas[0] ?? null;
}

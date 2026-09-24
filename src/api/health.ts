import { apiClient, HEALTH_PATH } from './client';

let warmUpStarted = false;

/**
 * "Acorda" o backend assim que o app carrega: no plano gratuito do Render ele
 * hiberna após inatividade e a primeira requisição leva ~30-60 s. Disparar
 * GET /health (público) em paralelo adianta essa partida enquanto o usuário
 * ainda digita o login.
 *
 * Fire-and-forget: não bloqueia a renderização, ignora qualquer falha (o
 * resultado não é exibido) e roda no máximo uma vez por carregamento da
 * página. Passa pelo apiClient para usar a mesma baseURL e as repetições
 * automáticas de GET em falhas transitórias.
 */
export function warmUpBackend(): void {
  if (warmUpStarted) return;
  warmUpStarted = true;
  apiClient.get(HEALTH_PATH).catch(() => {});
}

/** Apenas para testes: permite disparar o aquecimento de novo. */
export function resetWarmUpForTests(): void {
  warmUpStarted = false;
}

/**
 * Ponto único de checagem de permissão do frontend para dar baixa em débitos.
 *
 * PENDÊNCIA (regra de negócio ainda não definida): quando existirem
 * autenticação e papéis no backend, restringir esta ação ao papel de
 * Tesoureiro alterando SOMENTE este hook. Hoje não há autenticação, então
 * qualquer usuário pode pagar.
 *
 * Ocultar o botão é apenas UX: a autorização real precisa ser imposta pelo
 * backend na tarefa de autenticação.
 */
export function useCanPagarDebito(): boolean {
  return true;
}

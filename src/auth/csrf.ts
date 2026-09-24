/**
 * Token anti-CSRF da sessão atual.
 *
 * A sessão em si é o cookie HttpOnly definido pelo backend (o JS não o lê
 * nem o guarda). O backend exige o header `X-CSRF-Token` em toda escrita
 * (POST/PUT/PATCH/DELETE); o valor vem do login e de GET /auth/me.
 *
 * Decisão do orquestrador: o token fica SOMENTE EM MEMÓRIA (nada em
 * sessionStorage/localStorage). Após recarregar a página, ele é recuperado
 * via GET /auth/me ao restaurar a sessão.
 */
let csrfToken: string | null = null;

export function getCsrfToken(): string | null {
  return csrfToken;
}

export function setCsrfToken(value: string): void {
  csrfToken = value;
}

export function clearCsrfToken(): void {
  csrfToken = null;
}

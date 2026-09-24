/**
 * Ponte entre o cliente HTTP (api/client.ts) e o AuthProvider para o caso
 * "a API rejeitou a sessão" (401). Não depende de React nem do axios, para
 * evitar dependência circular.
 *
 * `sessionEpoch` identifica a sessão atual do cliente: é incrementado a cada
 * login/logout, e cada requisição é marcada com o valor vigente ao sair.
 * Assim, o 401 atrasado de uma requisição da sessão anterior não derruba
 * uma sessão nova iniciada enquanto ela estava em curso.
 */
let unauthorizedHandler: (() => void) | null = null;
let sessionEpoch = 0;

export function getSessionEpoch(): number {
  return sessionEpoch;
}

/** Marca o início/fim de uma sessão (login ou logout). */
export function nextSessionEpoch(): void {
  sessionEpoch += 1;
}

/**
 * Registra quem deve reagir a um 401 de requisição autenticada (o
 * AuthProvider). Retorna a função de cancelamento do registro.
 */
export function setUnauthorizedHandler(handler: () => void): () => void {
  unauthorizedHandler = handler;
  return () => {
    if (unauthorizedHandler === handler) unauthorizedHandler = null;
  };
}

/** Chamado pelo cliente HTTP ao receber 401 de uma requisição autenticada. */
export function handleUnauthorized(): void {
  unauthorizedHandler?.();
}

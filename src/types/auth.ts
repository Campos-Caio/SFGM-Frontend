/** Usuário autenticado. */
export interface Usuario {
  id: number;
  login: string;
  nome: string;
}

/**
 * Resposta de POST /auth/login. A sessão é o cookie HttpOnly gravado pelo
 * backend; o frontend usa apenas `csrf_token` e `usuario` (o
 * `access_token` do corpo existe só para clientes Bearer e é ignorado).
 */
export interface LoginResponse {
  csrf_token: string;
  usuario: Usuario;
  expires_in: number;
}

/** Resposta de GET /auth/me: usuário da sessão + token anti-CSRF dela. */
export interface MeResponse extends Usuario {
  csrf_token: string;
}

/**
 * Converte string vazia (campo opcional deixado em branco em um form) para
 * `null`. Necessário porque a API valida alguns campos opcionais com tipos
 * estritos (ex.: `email: EmailStr | None` em Loja/Membro) que rejeitam ""
 * como e-mail inválido — apenas null ou um valor válido são aceitos.
 */
export function emptyToNull(value: string): string | null {
  return value.trim() === '' ? null : value;
}

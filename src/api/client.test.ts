import { describe, it, expect } from 'vitest';
import { extractErrorMessage } from './client';

describe('extractErrorMessage', () => {
  it('extrai mensagem de erro de negócio (detail: string)', () => {
    const error = {
      isAxiosError: true,
      response: { status: 409, data: { detail: 'CIM já cadastrado.' } },
    };
    expect(extractErrorMessage(error)).toBe('CIM já cadastrado.');
  });

  it('extrai mensagem de erro de validação Pydantic (detail: lista de objetos)', () => {
    const error = {
      isAxiosError: true,
      response: {
        status: 422,
        data: {
          detail: [
            { loc: ['body', 'competencia'], msg: 'competência deve ser dia 1 do mês' },
          ],
        },
      },
    };
    expect(extractErrorMessage(error)).toBe(
      'competencia: competência deve ser dia 1 do mês'
    );
  });

  it('retorna mensagem amigável quando não há resposta do servidor (erro de rede)', () => {
    const error = { isAxiosError: true, response: undefined };
    expect(extractErrorMessage(error)).toMatch(/conectar ao servidor/);
  });

  it('retorna mensagem genérica para erro desconhecido', () => {
    expect(extractErrorMessage('algo inesperado')).toBe('Ocorreu um erro inesperado.');
  });
});

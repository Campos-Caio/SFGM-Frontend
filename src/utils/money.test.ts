import { describe, it, expect } from 'vitest';
import {
  compararValores,
  paraCentavos,
  rotuloSaldo,
  somarValores,
  subtrairValores,
  validarValorPositivo,
  validarSaldoInicial,
  valorAbsoluto,
} from './money';

describe('somarValores', () => {
  it('soma em centavos, sem erro de ponto flutuante', () => {
    expect(somarValores(['0.10', '0.20'])).toBe('0.30');
    expect(somarValores(['100.00', '30.50', '9.99'])).toBe('140.49');
  });

  it('lista vazia resulta em zero e valores inválidos são ignorados', () => {
    expect(somarValores([])).toBe('0.00');
    expect(somarValores(['abc', '5'])).toBe('5.00');
  });
});

describe('validarSaldoInicial', () => {
  it.each(['0', '0.00', '-0.01', '1234.5', '-1234.56', '9999999999.99', '-9999999999.99'])(
    'aceita %s',
    (valor) => {
      expect(validarSaldoInicial(valor)).toBeNull();
    }
  );

  it.each([
    ['', 'Informe o saldo inicial.'],
    ['1.234', 'Informe um valor com no máximo 2 casas decimais.'],
    ['1e5', 'Informe um valor com no máximo 2 casas decimais.'],
    ['abc', 'Informe um valor com no máximo 2 casas decimais.'],
    ['10000000000.00', 'O valor deve estar entre -9.999.999.999,99 e 9.999.999.999,99.'],
    ['-10000000000', 'O valor deve estar entre -9.999.999.999,99 e 9.999.999.999,99.'],
  ])('rejeita "%s"', (valor, mensagem) => {
    expect(validarSaldoInicial(valor)).toBe(mensagem);
  });
});

describe('paraCentavos / compararValores', () => {
  it('converte em centavos inteiros, sem erro de ponto flutuante', () => {
    expect(paraCentavos('0.29')).toBe(29);
    expect(paraCentavos('1234.56')).toBe(123456);
    expect(paraCentavos('-10.10')).toBe(-1010);
    expect(paraCentavos('abc')).toBe(0);
  });

  it('compara em centavos (crédito x valor em aberto)', () => {
    // 0.1 + 0.2 em ponto flutuante não é 0.3; em centavos é.
    expect(compararValores(somarValores(['0.10', '0.20']), '0.30')).toBe(0);
    expect(compararValores('180.00', '180')).toBe(0);
    expect(compararValores('179.99', '180.00')).toBeLessThan(0);
    expect(compararValores('200.00', '180.00')).toBeGreaterThan(0);
  });
});

/** Intl usa espaço não separável entre "R$" e o número. */
const semNbsp = (texto: string) => texto.replace(/ /g, ' ');

describe('valorAbsoluto / rotuloSaldo', () => {
  it('remove o sinal mantendo 2 casas', () => {
    expect(valorAbsoluto('-150.5')).toBe('150.50');
    expect(valorAbsoluto('20')).toBe('20.00');
  });

  it('descreve o saldo sem sinal cru', () => {
    expect(semNbsp(rotuloSaldo('-150.00'))).toBe('Deve R$ 150,00');
    expect(semNbsp(rotuloSaldo('20.50'))).toBe('Crédito de R$ 20,50');
    expect(rotuloSaldo('0.00')).toBe('Em dia');
  });
});

describe('validarValorPositivo', () => {
  it.each(['0.01', '150', '150.5', '9999999999.99'])('aceita %s', (valor) => {
    expect(validarValorPositivo(valor)).toBeNull();
  });

  it.each([
    ['', 'Informe o valor.'],
    ['0', 'O valor deve ser maior que zero.'],
    ['0.00', 'O valor deve ser maior que zero.'],
    ['-5', 'Informe um valor com no máximo 2 casas decimais.'],
    ['1.234', 'Informe um valor com no máximo 2 casas decimais.'],
    ['10000000000', 'O valor deve ser no máximo 9.999.999.999,99.'],
  ])('rejeita "%s"', (valor, mensagem) => {
    expect(validarValorPositivo(valor)).toBe(mensagem);
  });
});

describe('subtrairValores', () => {
  it('subtrai em centavos, sem erro de ponto flutuante', () => {
    expect(subtrairValores('0.30', '0.10')).toBe('0.20');
    expect(subtrairValores('200', '180.00')).toBe('20.00');
    expect(subtrairValores('100.00', '100')).toBe('0.00');
  });
});

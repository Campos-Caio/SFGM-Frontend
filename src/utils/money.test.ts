import { describe, it, expect } from 'vitest';
import { somarValores } from './money';

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

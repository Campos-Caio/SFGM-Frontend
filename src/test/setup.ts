import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Sem `globals: true` no vitest.config, o afterEach global não existe, então
// a limpeza automática do Testing Library entre testes precisa ser
// registrada explicitamente aqui.
afterEach(() => {
  cleanup();
});

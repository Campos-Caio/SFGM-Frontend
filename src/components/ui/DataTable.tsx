import type { MouseEvent, ReactNode } from 'react';

export interface DataTableColumn<T> {
  header: string;
  /** Renderiza o conteúdo da célula para uma linha. */
  render: (row: T) => ReactNode;
  /** Permite quebra de linha em vez de truncar/rolar (ex.: colunas de texto livre). */
  wrap?: boolean;
  align?: 'left' | 'right';
  /** Largura fixa opcional (ex.: coluna de ações), evita "pulos" de layout. */
  width?: string;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  /** Extrai uma key estável de cada linha (ex.: row => row.id). */
  rowKey: (row: T) => string | number;
  className?: string;
  /**
   * Torna a linha inteira clicável (opcional; sem ela a linha não é clicável).
   * Não dispara quando o clique vem de um controle interativo dentro da linha
   * (link, botão, campo etc.), com Ctrl/Cmd/Shift/Alt ou com texto selecionado.
   * Não substitui um link real na linha: ele segue sendo o alvo de teclado,
   * leitor de tela e "abrir em nova aba".
   */
  onRowClick?: (row: T) => void;
}

const INTERACTIVE_SELECTOR = 'a,button,input,select,textarea,label,summary,[role="button"],[role="link"]';

function shouldIgnoreRowClick(event: MouseEvent<HTMLElement>): boolean {
  if (event.defaultPrevented) return true;
  if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return true;
  const target = event.target as HTMLElement | null;
  if (target?.closest?.(INTERACTIVE_SELECTOR)) return true;
  const selection = typeof window !== 'undefined' ? window.getSelection?.() : null;
  return !!selection && !selection.isCollapsed && selection.toString().length > 0;
}

/**
 * Tabela administrativa genérica — não conhece nenhuma entidade específica,
 * recebe colunas + linhas. Cabeçalho consistente, hover de linha, valores
 * monetários alinháveis à direita e rolagem horizontal em telas estreitas.
 */
export function DataTable<T>({ columns, rows, rowKey, className = '', onRowClick }: DataTableProps<T>) {
  return (
    <div className={`overflow-x-auto bg-white border border-slate-200 rounded-lg shadow-sm ${className}`}>
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead>
          <tr className="bg-slate-50">
            {columns.map((col) => (
              <th
                key={col.header}
                style={col.width ? { width: col.width } : undefined}
                className={`px-4 py-3 border-b border-slate-200 font-semibold text-xs uppercase tracking-wide text-slate-500 ${
                  col.align === 'right' ? 'text-right' : 'text-left'
                }`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={rowKey(row)}
              onClick={
                onRowClick
                  ? (event) => {
                      if (!shouldIgnoreRowClick(event)) onRowClick(row);
                    }
                  : undefined
              }
              className={`border-b border-slate-100 last:border-b-0 hover:bg-slate-50 transition-colors${
                onRowClick ? ' cursor-pointer' : ''
              }`}
            >
              {columns.map((col) => (
                <td
                  key={col.header}
                  className={`px-4 py-3 align-middle text-slate-700 ${
                    col.wrap ? 'whitespace-normal' : 'whitespace-nowrap'
                  } ${col.align === 'right' ? 'text-right tabular-nums' : 'text-left'}`}
                >
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

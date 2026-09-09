/** Bloco retangular animado (base de todos os placeholders de carregamento). */
export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-slate-200 ${className}`} />;
}

/** Placeholder de uma tabela (cabeçalho + N linhas), usado enquanto uma listagem carrega. */
export function SkeletonTable({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex gap-4 border-b border-slate-200 bg-slate-50 px-4 py-3">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-3 flex-1" />
        ))}
      </div>
      <div role="status" aria-label="Carregando dados" className="divide-y divide-slate-100">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex gap-4 px-4 py-4">
            {Array.from({ length: columns }).map((_, j) => (
              <Skeleton key={j} className="h-4 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Placeholder de cartões estatísticos (StatCard) em carregamento. */
export function SkeletonStatCards({ count = 3 }: { count?: number }) {
  return (
    <div role="status" aria-label="Carregando indicadores" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <Skeleton className="h-3 w-24 mb-3" />
          <Skeleton className="h-7 w-32" />
        </div>
      ))}
    </div>
  );
}

/** Placeholder de um bloco de texto/formulário em carregamento. */
export function SkeletonCard() {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <Skeleton className="h-4 w-40 mb-4" />
      <Skeleton className="h-3 w-full mb-2" />
      <Skeleton className="h-3 w-3/4 mb-2" />
      <Skeleton className="h-3 w-1/2" />
    </div>
  );
}

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Download, Eye, FileText, Mail, MessageCircle, Users } from 'lucide-react';
import { membrosApi } from '../../api/membros';
import { documentosApi } from '../../api/documentos';
import { extractErrorMessage } from '../../api/client';
import { useCurrentStore } from '../../hooks/useCurrentStore';
import { SemLojaState } from '../../components/loja/SemLojaState';
import {
  Alert,
  Button,
  Card,
  EmptyState,
  ErrorState,
  FilterField,
  Input,
  PageHeader,
  Select,
} from '../../components/ui';
import { SkeletonCard } from '../../components/ui/Skeleton';
import type { Membro } from '../../types/membro';
import type { DocumentoMembroData } from '../../types/documentoMembro';
import { DEBITO_TIPO_LABELS } from '../../types/debito';
import { formatCurrency, formatDataBr, formatMesAno, monthInputToCompetencia } from '../../utils/formatters';
import { currentMonthInput } from '../../utils/businessTime';

export default function DocumentosPage() {
  const { loja, loading: loadingLoja, error: lojaError } = useCurrentStore();
  const [searchParams] = useSearchParams();
  const [membros, setMembros] = useState<Membro[]>([]);
  const [membroId, setMembroId] = useState(searchParams.get('membro_id') ?? '');
  const [competenciaMes, setCompetenciaMes] = useState('');

  const [documento, setDocumento] = useState<DocumentoMembroData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gerandoPdf, setGerandoPdf] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const autoFetchDoneRef = useRef(false);

  useEffect(() => {
    if (loja) {
      membrosApi.list(loja.id).then(setMembros).catch(() => {});
    }
  }, [loja]);

  function buscarDocumento(membroIdValue: string, competenciaMesValue: string) {
    if (!loja || !membroIdValue || !competenciaMesValue) return;
    setLoading(true);
    setError(null);
    setDocumento(null);
    documentosApi
      .get(loja.id, Number(membroIdValue), monthInputToCompetencia(competenciaMesValue))
      .then(setDocumento)
      .catch((err) => setError(extractErrorMessage(err)))
      .finally(() => setLoading(false));
  }

  // Vindo de "Ver documento" na lista de membros (?membro_id=X): assim que a
  // loja e a lista de membros estiverem carregadas e o membro_id da URL for
  // válido, pré-seleciona o mês atual e busca o documento automaticamente.
  useEffect(() => {
    if (autoFetchDoneRef.current) return;
    const membroIdFromUrl = searchParams.get('membro_id');
    if (!loja || !membroIdFromUrl || membros.length === 0) return;

    const membroValido = membros.some((m) => String(m.id) === membroIdFromUrl);
    if (!membroValido) return;

    autoFetchDoneRef.current = true;
    const mesAtual = currentMonthInput();
    setCompetenciaMes(mesAtual);
    buscarDocumento(membroIdFromUrl, mesAtual);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loja, membros, searchParams]);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    buscarDocumento(membroId, competenciaMes);
  }

  async function handleGerarPdf() {
    if (!loja || !membroId || !competenciaMes) return;
    setGerandoPdf(true);
    setPdfError(null);
    try {
      const { blob, filename } = await documentosApi.getPdfBlob(
        loja.id,
        Number(membroId),
        monthInputToCompetencia(competenciaMes)
      );
      const url = URL.createObjectURL(blob);
      const opened = window.open(url, '_blank');
      if (!opened) {
        // Pop-up bloqueado pelo navegador: baixa o arquivo em vez de abrir.
        const link = document.createElement('a');
        link.href = url;
        link.download = filename ?? 'documento.pdf';
        link.click();
      }
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      setPdfError(extractErrorMessage(err));
    } finally {
      setGerandoPdf(false);
    }
  }

  if (loadingLoja) {
    return (
      <>
        <PageHeader title="Documento do Irmão" />
        <SkeletonCard />
      </>
    );
  }

  if (lojaError) {
    return (
      <>
        <PageHeader title="Documento do Irmão" />
        <ErrorState message={lojaError} />
      </>
    );
  }

  if (!loja) {
    return (
      <>
        <PageHeader title="Documento do Irmão" />
        <SemLojaState
          description="Cadastre a loja antes de visualizar o documento do irmão."
        />
      </>
    );
  }

  if (membros.length === 0) {
    return (
      <>
        <PageHeader title="Documento do Irmão" />
        <EmptyState
          icon={Users}
          title="Nenhum membro cadastrado"
          description="Cadastre um membro nesta loja antes de visualizar o documento do irmão."
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Documento do Irmão"
        description="Selecione um irmão e a competência para emitir o documento financeiro."
      />

      <Card className="mb-6">
        <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-4">
          <FilterField label="Irmão" htmlFor="membro_id">
            <Select id="membro_id" value={membroId} onChange={(e) => setMembroId(e.target.value)} required>
              <option value="" disabled>
                Selecione...
              </option>
              {membros.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nome} (CIM {m.cim})
                </option>
              ))}
            </Select>
          </FilterField>
          <FilterField label="Competência de cobrança" htmlFor="competencia_mes">
            <Input
              id="competencia_mes"
              type="month"
              value={competenciaMes}
              onChange={(e) => setCompetenciaMes(e.target.value)}
              required
            />
          </FilterField>
          <Button type="submit" disabled={loading} icon={loading ? undefined : Eye}>
            {loading ? 'Carregando...' : 'Visualizar documento'}
          </Button>
        </form>
      </Card>

      {loading && <SkeletonCard />}
      {error && <ErrorState message={error} onRetry={() => buscarDocumento(membroId, competenciaMes)} />}

      {!loading && !error && !documento && (
        <EmptyState
          icon={FileText}
          title="Nenhum documento selecionado"
          description="Escolha um irmão e a competência acima para visualizar o documento."
        />
      )}

      {documento && (
        <div className="rounded-lg border border-slate-300 bg-white shadow-sm">
          {/* Toolbar do documento: título + ações — visualmente separada do papel do documento */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-6 py-3 rounded-t-lg">
            <h2 className="m-0 text-sm font-semibold text-slate-700">
              Documento — {formatMesAno(documento.competencia_cobranca)}
            </h2>
            <div className="flex items-center gap-2">
              <Button onClick={handleGerarPdf} disabled={gerandoPdf} icon={Download} size="sm">
                {gerandoPdf ? 'Gerando PDF...' : 'Baixar PDF'}
              </Button>
              <Button variant="secondary" size="sm" icon={Mail} disabled title="Em breve">
                E-mail
              </Button>
              <Button variant="secondary" size="sm" icon={MessageCircle} disabled title="Em breve">
                WhatsApp
              </Button>
            </div>
          </div>

          {pdfError ? (
            <div className="px-6 pt-4">
              <Alert variant="error" className="mb-0">
                {pdfError}
              </Alert>
            </div>
          ) : null}

          {/* Corpo do documento: identidade visual própria de papel financeiro formal */}
          <div className="p-8 font-serif text-slate-800">
            <div className="flex justify-between items-start flex-wrap gap-3 border-b border-slate-300 pb-4 mb-4">
              <div>
                <p className="m-0 font-semibold uppercase tracking-wide">{documento.loja.nome}</p>
                <p className="m-0 text-sm">Nº {documento.loja.numero}</p>
                <p className="m-0 text-sm">CNPJ(MF): {documento.loja.cnpj}</p>
              </div>
              <div className="text-right text-sm">
                <p className="m-0 font-semibold">Período de referência</p>
                <p className="m-0">{formatMesAno(documento.competencia_cobranca)}</p>
              </div>
            </div>

            <div className="mb-6 text-sm">
              <p className="m-0">
                <strong>Irmão:</strong> {documento.membro.nome}
              </p>
              <p className="m-0">
                <strong>CIM:</strong> {documento.membro.cim}
              </p>
              <p className="m-0">
                <strong>Contato:</strong> {documento.membro.telefone || '—'}
              </p>
            </div>

            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide">Débitos do período</h3>
            {documento.debitos.length > 0 ? (
              <table className="w-full border-collapse text-sm mb-2">
                <thead>
                  <tr>
                    <th className="text-left py-2 border-b border-slate-300 font-semibold">Descrição</th>
                    <th className="text-left py-2 border-b border-slate-300 font-semibold">Data</th>
                    <th className="text-right py-2 border-b border-slate-300 font-semibold">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {documento.debitos.map((d) => (
                    <tr key={d.id}>
                      <td className="py-2 border-b border-slate-200">
                        {DEBITO_TIPO_LABELS[d.tipo]}
                        {d.descricao ? ` — ${d.descricao}` : ''}
                      </td>
                      <td className="py-2 border-b border-slate-200">{formatDataBr(d.data)}</td>
                      <td className="py-2 border-b border-slate-200 text-right tabular-nums">
                        {formatCurrency(d.valor)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="font-semibold">
                    <td className="py-2">Total</td>
                    <td className="py-2" />
                    <td className="py-2 text-right tabular-nums">{formatCurrency(documento.total_debitos)}</td>
                  </tr>
                </tfoot>
              </table>
            ) : (
              <Alert variant="info">
                Nenhum débito registrado para este período. Total: <strong>{formatCurrency(documento.total_debitos)}</strong>
              </Alert>
            )}

            <h3 className="mb-2 mt-6 text-sm font-semibold uppercase tracking-wide">
              Prestação de contas — {formatMesAno(documento.competencia_prestacao)}
            </h3>
            {documento.prestacao_contas.receitas.length === 0 &&
            documento.prestacao_contas.despesas.length === 0 ? (
              <Alert variant="info">Nenhum lançamento registrado neste período (estado sem prestação anterior).</Alert>
            ) : (
              <p
                className={`text-sm ${Number(documento.prestacao_contas.resultado) < 0 ? 'text-red-700 font-semibold' : 'font-semibold'}`}
              >
                Superávit/Déficit do período: {formatCurrency(documento.prestacao_contas.resultado)}
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}

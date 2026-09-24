import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useLocation } from 'react-router-dom';
import axios from 'axios';
import { Eye, Filter, Pencil, Plus, Receipt, RefreshCw } from 'lucide-react';
import {
  debitosApi,
  ERRO_SEM_DEBITO_RECORRENTE_ATIVO,
  type MembroIgnoradoEmMassa,
  type MembroJaCobrado,
} from '../../api/debitos';
import { debitosRecorrentesApi } from '../../api/debitosRecorrentes';
import { membrosApi } from '../../api/membros';
import { extractErrorMessage } from '../../api/client';
import { useCurrentStore } from '../../hooks/useCurrentStore';
import { SemLojaState } from '../../components/loja/SemLojaState';
import {
  Alert,
  Button,
  Card,
  DataTable,
  EmptyState,
  ErrorState,
  FilterField,
  Input,
  LinkButton,
  Modal,
  PageHeader,
  Select,
} from '../../components/ui';
import { SkeletonTable } from '../../components/ui/Skeleton';
import {
  DEBITO_TIPO_LABELS,
  MOTIVO_IGNORADO_LABELS,
  type DebitoMembro,
  type DebitoMembroTipo,
  type DebitoRecorrente,
} from '../../types/debito';
import type { Membro } from '../../types/membro';
import { formatCurrency, formatMesAno, monthInputToCompetencia } from '../../utils/formatters';
import { currentMonthInput } from '../../utils/businessTime';
import { somarValores } from '../../utils/money';

/** Acima deste número de irmãos já cobrados, o resultado mostra só a contagem. */
const MAX_NOMES_JA_COBRADOS = 10;

/** Estado de navegação enviado pelo DebitoFormPage após o lançamento em massa. */
interface ResultadoEmMassa {
  criados: number;
  ignorados: MembroIgnoradoEmMassa[];
}

export default function DebitosListPage() {
  const location = useLocation();
  const navState = location.state as {
    abrirModalMensalidades?: boolean;
    resultadoEmMassa?: ResultadoEmMassa;
  } | null;
  const resultadoEmMassa = navState?.resultadoEmMassa ?? null;
  const { loja, loading: loadingLoja, error: lojaError } = useCurrentStore();
  const [membros, setMembros] = useState<Membro[]>([]);
  const [debitos, setDebitos] = useState<DebitoMembro[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [competenciaMes, setCompetenciaMes] = useState('');
  const [membroId, setMembroId] = useState('');
  const [tipo, setTipo] = useState('');

  const [modalOpen, setModalOpen] = useState(Boolean(navState?.abrirModalMensalidades));
  const [modalCompetencia, setModalCompetencia] = useState('');
  const [gerando, setGerando] = useState(false);
  const [gerarError, setGerarError] = useState<string | null>(null);
  // 422 com `X-Error-Code: SEM_DEBITO_RECORRENTE_ATIVO`: oferece link para configurar na Loja.
  const [semRecorrenteAtivo, setSemRecorrenteAtivo] = useState(false);
  const [gerarResultado, setGerarResultado] = useState<{
    criados: number;
    jaCobrados: MembroJaCobrado[];
    competenciaMes: string;
  } | null>(null);

  // Prévia (informativa) dos itens recorrentes ativos no modal de geração.
  const [previa, setPrevia] = useState<DebitoRecorrente[] | null>(null);
  const [previaLoading, setPreviaLoading] = useState(false);
  const [previaError, setPreviaError] = useState(false);

  const membroNomes = useMemo(() => new Map(membros.map((m) => [m.id, m.nome])), [membros]);

  function loadDebitos() {
    if (!loja) return;
    setLoading(true);
    setError(null);
    debitosApi
      .listByLoja(loja.id, {
        competencia: competenciaMes ? monthInputToCompetencia(competenciaMes) : undefined,
        membro_id: membroId ? Number(membroId) : undefined,
        tipo: (tipo as DebitoMembroTipo) || undefined,
      })
      .then(setDebitos)
      .catch((err) => setError(extractErrorMessage(err)))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (!loja) {
      setLoading(false);
      return;
    }
    membrosApi.list(loja.id).then(setMembros).catch(() => {});
    loadDebitos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loja]);

  // Carrega a prévia sempre que o modal abre (inclusive quando aberto via
  // navegação a partir do Dashboard).
  useEffect(() => {
    if (!modalOpen || !loja) return;
    let active = true;
    setPreviaLoading(true);
    setPreviaError(false);
    debitosRecorrentesApi
      .list(loja.id)
      .then((itens) => {
        if (active) setPrevia(itens.filter((i) => i.ativo));
      })
      .catch(() => {
        if (active) setPreviaError(true);
      })
      .finally(() => {
        if (active) setPreviaLoading(false);
      });
    return () => {
      active = false;
    };
  }, [modalOpen, loja]);

  function handleFilterSubmit(e: FormEvent) {
    e.preventDefault();
    loadDebitos();
  }

  function openModal() {
    setModalCompetencia(competenciaMes || currentMonthInput());
    setGerarError(null);
    setSemRecorrenteAtivo(false);
    setModalOpen(true);
  }

  async function handleGerarMensalidades() {
    if (!loja || !modalCompetencia) return;
    setGerando(true);
    setGerarError(null);
    setSemRecorrenteAtivo(false);
    try {
      const resultado = await debitosApi.gerarMensalidades(loja.id, monthInputToCompetencia(modalCompetencia));
      setGerarResultado({
        criados: resultado.debitos_criados.length,
        jaCobrados: resultado.membros_ja_cobrados,
        competenciaMes: modalCompetencia,
      });
      setModalOpen(false);
      loadDebitos();
    } catch (err) {
      if (
        axios.isAxiosError(err) &&
        err.response?.status === 422 &&
        err.response.headers?.['x-error-code'] === ERRO_SEM_DEBITO_RECORRENTE_ATIVO
      ) {
        setSemRecorrenteAtivo(true);
      }
      setGerarError(extractErrorMessage(err));
    } finally {
      setGerando(false);
    }
  }

  if (loadingLoja) {
    return (
      <>
        <PageHeader title="Débitos" />
        <SkeletonTable columns={4} />
      </>
    );
  }

  if (lojaError) {
    return (
      <>
        <PageHeader title="Débitos" />
        <ErrorState message={lojaError} />
      </>
    );
  }

  if (!loja) {
    return (
      <>
        <PageHeader title="Débitos" />
        <SemLojaState
          icon={Receipt}
          description="Cadastre a loja antes de gerenciar débitos."
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Débitos"
        description="Cobranças e mensalidades lançadas para os membros."
        actions={
          <>
            <Button type="button" variant="outline" icon={RefreshCw} onClick={openModal}>
              Gerar mensalidades
            </Button>
            <LinkButton to="/debitos/novo" icon={Plus}>
              Novo débito
            </LinkButton>
          </>
        }
      />

      {resultadoEmMassa && (
        <Alert variant={resultadoEmMassa.criados > 0 ? 'success' : 'info'}>
          {resultadoEmMassa.criados === 0 && resultadoEmMassa.ignorados.length === 0 ? (
            'Nenhum irmão ativo, nenhum débito criado.'
          ) : (
            <>
              {resultadoEmMassa.criados} débito(s) criado(s).
              {resultadoEmMassa.ignorados.length > 0 && (
                <>
                  {' '}
                  {resultadoEmMassa.ignorados.length} irmão(s) ignorado(s):
                  <ul className="mt-1 mb-0 list-disc pl-5">
                    {resultadoEmMassa.ignorados.map((m) => (
                      <li key={m.membro_id}>
                        {m.nome} ({MOTIVO_IGNORADO_LABELS[m.motivo] ?? m.motivo})
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </>
          )}
        </Alert>
      )}

      {gerarResultado && (
        <Alert variant="success">
          Mensalidades de {formatMesAno(gerarResultado.competenciaMes)}: {gerarResultado.criados} débito(s)
          criado(s).
          {gerarResultado.jaCobrados.length > 0 &&
            (gerarResultado.jaCobrados.length <= MAX_NOMES_JA_COBRADOS ? (
              <>
                {' '}
                {gerarResultado.jaCobrados.length} irmão(s) já estavam cobrados nesta competência:{' '}
                {gerarResultado.jaCobrados.map((m) => m.nome).join(', ')}.
              </>
            ) : (
              ` ${gerarResultado.jaCobrados.length} irmão(s) já estavam cobrados nesta competência.`
            ))}
        </Alert>
      )}

      <Card className="mb-4">
        <form onSubmit={handleFilterSubmit} className="flex flex-wrap items-end gap-4">
          <FilterField label="Competência" htmlFor="competencia_mes">
            <Input
              id="competencia_mes"
              type="month"
              value={competenciaMes}
              onChange={(e) => setCompetenciaMes(e.target.value)}
            />
          </FilterField>
          <FilterField label="Membro" htmlFor="membro_id">
            <Select id="membro_id" value={membroId} onChange={(e) => setMembroId(e.target.value)}>
              <option value="">Todos</option>
              {membros.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nome}
                </option>
              ))}
            </Select>
          </FilterField>
          <FilterField label="Tipo" htmlFor="tipo">
            <Select id="tipo" value={tipo} onChange={(e) => setTipo(e.target.value)}>
              <option value="">Todos</option>
              {Object.entries(DEBITO_TIPO_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </FilterField>
          <Button type="submit" icon={Filter}>
            Filtrar
          </Button>
        </form>
      </Card>

      {error ? (
        <ErrorState message={error} onRetry={loadDebitos} />
      ) : loading ? (
        <SkeletonTable columns={4} />
      ) : !debitos || debitos.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="Nenhum débito encontrado"
          description="Ajuste os filtros ou cadastre um novo débito para um membro."
          action={
            <LinkButton to="/debitos/novo" icon={Plus}>
              Cadastrar débito
            </LinkButton>
          }
        />
      ) : (
        <>
          <p className="mb-3 text-sm text-slate-500">{debitos.length} débito(s) encontrado(s)</p>
          <DataTable
            rowKey={(d) => d.id}
            rows={debitos}
            columns={[
              { header: 'Membro', render: (d) => membroNomes.get(d.membro_id) ?? '-' },
              { header: 'Tipo', render: (d) => DEBITO_TIPO_LABELS[d.tipo] },
              { header: 'Descrição', wrap: true, render: (d) => d.descricao || '-' },
              { header: 'Valor', align: 'right', render: (d) => formatCurrency(d.valor) },
              {
                header: 'Ações',
                align: 'right',
                render: (d) => (
                  <div className="flex justify-end gap-1">
                    <LinkButton to={`/debitos/${d.id}`} variant="secondary" size="sm" icon={Eye}>
                      Ver
                    </LinkButton>
                    {/* Débito de cobrança já paga não pode ser alterado (o backend responde 409). */}
                    {d.situacao === 'PAGO' ? (
                      <span className="inline-flex items-center px-2 text-xs text-slate-500">
                        Cobrança paga
                      </span>
                    ) : (
                      <LinkButton to={`/debitos/${d.id}/editar`} variant="secondary" size="sm" icon={Pencil}>
                        Editar
                      </LinkButton>
                    )}
                  </div>
                ),
              },
            ]}
          />
        </>
      )}

      <Modal
        open={modalOpen}
        title="Gerar mensalidades"
        description="Cria, para cada irmão ativo, os débitos recorrentes ativos da Loja que ele ainda não possui na competência selecionada. Irmãos com a competência já paga não recebem novos débitos."
        onClose={() => setModalOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)} type="button">
              Cancelar
            </Button>
            <Button onClick={handleGerarMensalidades} type="button" disabled={gerando || !modalCompetencia}>
              {gerando ? 'Gerando...' : 'Gerar mensalidades'}
            </Button>
          </>
        }
      >
        <FilterField label="Competência" htmlFor="modal_competencia_mes">
          <Input
            id="modal_competencia_mes"
            type="month"
            value={modalCompetencia}
            onChange={(e) => setModalCompetencia(e.target.value)}
            required
          />
        </FilterField>
        <div className="mt-4">
          <p className="m-0 mb-2 text-sm font-medium text-slate-700">Itens que serão gerados</p>
          {previaLoading ? (
            <p className="m-0 text-sm text-slate-500">Carregando itens...</p>
          ) : previaError ? (
            <p className="m-0 text-sm text-slate-500">Não foi possível carregar a prévia dos itens.</p>
          ) : previa && previa.length > 0 ? (
            <>
              <ul className="m-0 list-none divide-y divide-slate-100 rounded-md border border-slate-200 p-0">
                {previa.map((item) => (
                  <li key={item.id} className="flex justify-between gap-4 px-3 py-2">
                    <span>{item.descricao}</span>
                    <span className="tabular-nums">{formatCurrency(item.valor)}</span>
                  </li>
                ))}
              </ul>
              <p className="m-0 mt-2 flex justify-between gap-4 px-3 font-semibold">
                <span>Total por irmão</span>
                <span className="tabular-nums">
                  {formatCurrency(somarValores(previa.map((i) => i.valor)))}
                </span>
              </p>
            </>
          ) : previa ? (
            <p className="m-0 text-sm text-slate-500">Nenhum débito recorrente ativo cadastrado.</p>
          ) : null}
        </div>
        {gerarError && (
          <Alert variant="error" className="mt-4 mb-0">
            {gerarError}
            {semRecorrenteAtivo && (
              <>
                {' '}
                <Link to="/loja#debitos-recorrentes" className="underline font-medium">
                  Configure os débitos recorrentes na Loja
                </Link>
                .
              </>
            )}
          </Alert>
        )}
      </Modal>
    </>
  );
}

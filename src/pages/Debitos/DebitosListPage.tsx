import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useLocation } from 'react-router-dom';
import axios from 'axios';
import { Eye, Filter, Pencil, Plus, Receipt, RefreshCw } from 'lucide-react';
import { debitosApi } from '../../api/debitos';
import { membrosApi } from '../../api/membros';
import { extractErrorMessage } from '../../api/client';
import { useCurrentStore } from '../../hooks/useCurrentStore';
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
import { DEBITO_TIPO_LABELS, type DebitoMembro, type DebitoMembroTipo } from '../../types/debito';
import type { Membro } from '../../types/membro';
import { formatCurrency, formatMesAno, monthInputToCompetencia } from '../../utils/formatters';

/** "YYYY-MM" do mês atual, usado como competência padrão quando o filtro está vazio. */
function currentMonthInput(): string {
  const now = new Date();
  const mes = String(now.getMonth() + 1).padStart(2, '0');
  return `${now.getFullYear()}-${mes}`;
}

export default function DebitosListPage() {
  const location = useLocation();
  const { loja, loading: loadingLoja, error: lojaError } = useCurrentStore();
  const [membros, setMembros] = useState<Membro[]>([]);
  const [debitos, setDebitos] = useState<DebitoMembro[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [competenciaMes, setCompetenciaMes] = useState('');
  const [membroId, setMembroId] = useState('');
  const [tipo, setTipo] = useState('');

  const [modalOpen, setModalOpen] = useState(
    Boolean((location.state as { abrirModalMensalidades?: boolean } | null)?.abrirModalMensalidades)
  );
  const [modalCompetencia, setModalCompetencia] = useState('');
  const [gerando, setGerando] = useState(false);
  const [gerarError, setGerarError] = useState<string | null>(null);
  const [gerarMensalidadeNaoConfigurada, setGerarMensalidadeNaoConfigurada] = useState(false);
  const [gerarResultado, setGerarResultado] = useState<{
    criados: number;
    jaCobertos: number;
    competenciaMes: string;
  } | null>(null);

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

  function handleFilterSubmit(e: FormEvent) {
    e.preventDefault();
    loadDebitos();
  }

  function openModal() {
    setModalCompetencia(competenciaMes || currentMonthInput());
    setGerarError(null);
    setGerarMensalidadeNaoConfigurada(false);
    setModalOpen(true);
  }

  async function handleGerarMensalidades() {
    if (!loja || !modalCompetencia) return;
    setGerando(true);
    setGerarError(null);
    setGerarMensalidadeNaoConfigurada(false);
    try {
      const resultado = await debitosApi.gerarMensalidades(loja.id, monthInputToCompetencia(modalCompetencia));
      setGerarResultado({
        criados: resultado.debitos_criados.length,
        jaCobertos: resultado.membros_ja_cobrados.length,
        competenciaMes: modalCompetencia,
      });
      setModalOpen(false);
      loadDebitos();
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 422) {
        setGerarMensalidadeNaoConfigurada(true);
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
        <EmptyState
          icon={Receipt}
          title="Nenhuma loja cadastrada no sistema"
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

      {gerarResultado && (
        <Alert variant="success">
          Mensalidades de {formatMesAno(gerarResultado.competenciaMes)}: {gerarResultado.criados} débito(s)
          criado(s).
          {gerarResultado.jaCobertos > 0 &&
            ` ${gerarResultado.jaCobertos} membro(s) já estavam cobrados nesta competência.`}
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
                    <LinkButton to={`/debitos/${d.id}/editar`} variant="secondary" size="sm" icon={Pencil}>
                      Editar
                    </LinkButton>
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
        description="Isso criará a mensalidade para todos os irmãos ativos que ainda não possuem esse débito na competência selecionada."
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
        {gerarError && (
          <Alert variant="error" className="mt-4 mb-0">
            {gerarError}
            {gerarMensalidadeNaoConfigurada && (
              <>
                {' '}
                <Link to="/loja" className="underline font-medium">
                  Configure o valor da mensalidade na Loja
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

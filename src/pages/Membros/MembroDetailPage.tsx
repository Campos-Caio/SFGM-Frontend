import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Eye, Pencil, Power, PowerOff } from 'lucide-react';
import { membrosApi } from '../../api/membros';
import { creditosMembroApi } from '../../api/creditosMembro';
import { extractErrorMessage } from '../../api/client';
import {
  Alert,
  Button,
  Card,
  DescriptionList,
  ErrorState,
  LinkButton,
  PageHeader,
  StatusBadge,
} from '../../components/ui';
import { SkeletonCard } from '../../components/ui/Skeleton';
import type { Membro } from '../../types/membro';
import type { SaldoMembro } from '../../types/creditoMembro';
import CreditoMembroSection from './CreditoMembroSection';
import DebitosPorCompetenciaSection from './DebitosPorCompetenciaSection';

const SUCCESS_MESSAGES: Record<string, string> = {
  criado: 'Membro cadastrado com sucesso.',
  atualizado: 'Membro atualizado com sucesso.',
  status: 'Status atualizado com sucesso.',
};

export default function MembroDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [membro, setMembro] = useState<Membro | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [successKey, setSuccessKey] = useState<string | null>(
    (location.state as { sucesso?: string } | null)?.sucesso ?? null
  );

  function load() {
    if (!id) return;
    setLoading(true);
    setError(null);
    membrosApi
      .get(Number(id))
      .then(setMembro)
      .catch((err) => setError(extractErrorMessage(err)))
      .finally(() => setLoading(false));
  }

  useEffect(load, [id]);

  // Saldo do irmão: carregado aqui porque é compartilhado pelas seções de
  // crédito e de cobranças. `versaoFinanceiro` muda a cada ação financeira da
  // ficha e recarrega saldo, extrato e cobranças. A falha do saldo fica
  // isolada na seção (não derruba a ficha).
  const [versaoFinanceiro, setVersaoFinanceiro] = useState(0);
  const [saldo, setSaldo] = useState<SaldoMembro | null>(null);
  const [saldoError, setSaldoError] = useState<string | null>(null);
  const lojaId = membro?.loja_id;
  const membroId = membro?.id;

  useEffect(() => {
    if (lojaId === undefined || membroId === undefined) return;
    let active = true;
    creditosMembroApi
      .getSaldo(lojaId, membroId)
      .then((data) => {
        if (!active) return;
        setSaldo(data);
        setSaldoError(null);
      })
      .catch((err) => {
        if (active) setSaldoError(extractErrorMessage(err));
      });
    return () => {
      active = false;
    };
  }, [lojaId, membroId, versaoFinanceiro]);

  const recarregarFinanceiro = useCallback(() => setVersaoFinanceiro((v) => v + 1), []);

  async function handleToggleStatus() {
    if (!membro) return;
    setStatusUpdating(true);
    setError(null);
    try {
      const novoStatus = membro.status === 'ATIVO' ? 'INATIVO' : 'ATIVO';
      const updated = await membrosApi.updateStatus(membro.id, novoStatus);
      setMembro(updated);
      setSuccessKey('status');
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setStatusUpdating(false);
    }
  }

  if (loading) {
    return (
      <>
        <PageHeader title="Membro" />
        <SkeletonCard />
      </>
    );
  }

  if (error && !membro) {
    return (
      <>
        <PageHeader title="Membro" />
        <ErrorState message={error} onRetry={load} />
        <div className="mt-4">
          <Button variant="secondary" icon={ArrowLeft} onClick={() => navigate('/membros')}>
            Voltar para Membros
          </Button>
        </div>
      </>
    );
  }

  if (!membro) return null;

  return (
    <>
      <PageHeader title={membro.nome} description={`CIM ${membro.cim}`} />
      {error && <Alert variant="error">{error}</Alert>}
      {successKey && SUCCESS_MESSAGES[successKey] && (
        <Alert variant="success">{SUCCESS_MESSAGES[successKey]}</Alert>
      )}
      <Card>
        <DescriptionList
          className="mb-6"
          items={[
            { label: 'CIM', value: membro.cim },
            { label: 'Status', value: <StatusBadge status={membro.status} /> },
            { label: 'Telefone', value: membro.telefone || '-' },
            { label: 'E-mail', value: membro.email || '-' },
          ]}
        />

        <div className="flex gap-3 flex-wrap">
          <LinkButton to={`/membros/${membro.id}/editar`} icon={Pencil}>
            Editar membro
          </LinkButton>
          <Button
            variant="secondary"
            icon={membro.status === 'ATIVO' ? PowerOff : Power}
            onClick={handleToggleStatus}
            disabled={statusUpdating}
          >
            {membro.status === 'ATIVO' ? 'Inativar membro' : 'Ativar membro'}
          </Button>
          <LinkButton to={`/documentos?membro_id=${membro.id}`} variant="secondary" icon={Eye}>
            Ver documento
          </LinkButton>
          <LinkButton to="/membros" variant="ghost" icon={ArrowLeft}>
            Voltar
          </LinkButton>
        </div>
      </Card>

      <CreditoMembroSection
        key={`credito-${membro.id}`}
        lojaId={membro.loja_id}
        membro={membro}
        saldo={saldo}
        saldoError={saldoError}
        onRetrySaldo={recarregarFinanceiro}
        onAlterado={recarregarFinanceiro}
        versao={versaoFinanceiro}
      />

      <DebitosPorCompetenciaSection
        key={membro.id}
        lojaId={membro.loja_id}
        membroId={membro.id}
        creditoDisponivel={saldo?.total_credito ?? null}
        versao={versaoFinanceiro}
        onAlterado={recarregarFinanceiro}
      />
    </>
  );
}

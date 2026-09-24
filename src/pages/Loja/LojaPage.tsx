import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Pencil } from 'lucide-react';
import { lojaApi } from '../../api/loja';
import { useCurrentStore } from '../../hooks/useCurrentStore';
import {
  Alert,
  Button,
  Card,
  CardHeader,
  DescriptionList,
  ErrorState,
  PageHeader,
} from '../../components/ui';
import { SkeletonCard } from '../../components/ui/Skeleton';
import { LojaForm } from '../../components/loja/LojaForm';
import { SemLojaState } from '../../components/loja/SemLojaState';
import type { Loja, LojaInput } from '../../types/loja';
import { DebitosRecorrentesSection } from './DebitosRecorrentesSection';

export default function LojaPage() {
  const { loja: currentLoja, loading, error: loadError, refresh } = useCurrentStore();
  // Versão salva nesta tela após a edição; até lá, exibe a loja atual.
  const [savedLoja, setSavedLoja] = useState<Loja | null>(null);
  const loja = savedLoja ?? currentLoja;
  const [mode, setMode] = useState<'view' | 'edit'>('view');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const location = useLocation();
  const showingView = Boolean(loja) && mode === 'view';

  // `/loja#debitos-recorrentes` (ex.: link do modal "Gerar mensalidades"):
  // o router não rola até a âncora sozinho, e a seção só existe após a carga.
  useEffect(() => {
    if (!showingView || location.hash !== '#debitos-recorrentes') return;
    document.getElementById('debitos-recorrentes')?.scrollIntoView?.({ block: 'start' });
  }, [showingView, location.hash]);

  async function handleUpdate(payload: LojaInput) {
    if (!loja) return;
    const updated = await lojaApi.update(loja.id, payload);
    setSavedLoja(updated);
    setSuccessMessage('Dados da Loja atualizados com sucesso.');
    setMode('view');
    // Atualiza a loja atual compartilhada (ex.: nome no Header) sem recarregar.
    await refresh();
  }

  if (loading) {
    return (
      <>
        <PageHeader title="Loja" />
        <SkeletonCard />
      </>
    );
  }

  if (loadError) {
    return (
      <>
        <PageHeader title="Loja" />
        <ErrorState message={loadError} />
      </>
    );
  }

  if (!loja) {
    return (
      <>
        <PageHeader title="Loja" />
        <SemLojaState description="Cadastre a loja para configurar o sistema." />
      </>
    );
  }

  if (mode === 'edit') {
    return (
      <>
        <PageHeader title="Editar dados da Loja" description="Atualize as informações institucionais e de contato." />
        <LojaForm loja={loja} onSubmit={handleUpdate} onCancel={() => setMode('view')} />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Loja"
        description="Informações institucionais, contato e configurações usadas pelo sistema."
        actions={
          <Button icon={Pencil} onClick={() => setMode('edit')}>
            Editar informações
          </Button>
        }
      />
      {successMessage && <Alert variant="success">{successMessage}</Alert>}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Informações gerais" />
          <DescriptionList
            items={[
              { label: 'Nome', value: loja.nome },
              { label: 'Número', value: loja.numero },
              { label: 'CNPJ', value: loja.cnpj },
              { label: 'URL do logo', value: loja.logo_url || '-' },
            ]}
          />
        </Card>

        <Card>
          <CardHeader title="Contato" />
          <DescriptionList
            items={[
              { label: 'Telefone', value: loja.telefone || '-' },
              { label: 'E-mail', value: loja.email || '-' },
            ]}
          />
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="PIX" description="Usado na emissão de documentos e cobranças." />
          <DescriptionList
            items={[
              { label: 'Chave PIX', value: loja.pix_chave || '-' },
              { label: 'Descrição do PIX', value: loja.pix_descricao || '-' },
            ]}
          />
        </Card>
      </div>

      <DebitosRecorrentesSection lojaId={loja.id} />
    </>
  );
}

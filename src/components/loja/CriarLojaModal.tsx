import { useId, useState } from 'react';
import { lojaApi } from '../../api/loja';
import { useCurrentStore } from '../../hooks/useCurrentStore';
import { Button, Modal } from '../ui';
import type { LojaInput } from '../../types/loja';
import { LojaForm } from './LojaForm';

interface CriarLojaModalProps {
  onClose: () => void;
}

/**
 * Cadastro da loja em um modal (usado quando o sistema ainda não tem loja).
 * Após o POST /loja, recarrega a loja atual para que Header e telas passem a
 * usá-la sem recarregar a página. Monte-o somente quando for exibido: o
 * estado do formulário nasce a cada abertura.
 */
export function CriarLojaModal({ onClose }: CriarLojaModalProps) {
  const { refresh } = useCurrentStore();
  const [submitting, setSubmitting] = useState(false);
  const formId = useId();

  function handleClose() {
    // Não permite fechar (ESC, overlay, X, Cancelar) enquanto a loja é salva.
    if (submitting) return;
    onClose();
  }

  async function handleCreate(payload: LojaInput) {
    setSubmitting(true);
    try {
      // Erros (409 CNPJ duplicado, 422) propagam para o LojaForm exibir.
      await lojaApi.create(payload);
      await refresh();
    } finally {
      setSubmitting(false);
    }
    onClose();
  }

  return (
    <Modal
      open
      size="xl"
      title="Cadastrar Loja"
      description="Informe os dados da Loja para começar a usar o sistema."
      onClose={handleClose}
      footer={
        <>
          <Button variant="secondary" type="button" onClick={handleClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button type="submit" form={formId} disabled={submitting}>
            {submitting ? 'Salvando...' : 'Cadastrar'}
          </Button>
        </>
      }
    >
      <LojaForm formId={formId} onSubmit={handleCreate} />
    </Modal>
  );
}

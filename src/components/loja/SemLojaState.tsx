import { useState, type ReactNode } from 'react';
import { Building2, Plus, type LucideIcon } from 'lucide-react';
import { Button, EmptyState } from '../ui';
import { CriarLojaModal } from './CriarLojaModal';

interface SemLojaStateProps {
  /** Ícone ilustrativo da tela (padrão: Building2). */
  icon?: LucideIcon;
  description?: ReactNode;
}

/**
 * Estado vazio "Nenhuma loja cadastrada no sistema" com a ação
 * "Cadastre a Loja", que abre o modal de cadastro no próprio lugar.
 */
export function SemLojaState({ icon = Building2, description }: SemLojaStateProps) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <EmptyState
        icon={icon}
        title="Nenhuma loja cadastrada no sistema"
        description={description}
        action={
          <Button icon={Plus} onClick={() => setModalOpen(true)}>
            Cadastre a Loja
          </Button>
        }
      />
      {modalOpen && <CriarLojaModal onClose={() => setModalOpen(false)} />}
    </>
  );
}

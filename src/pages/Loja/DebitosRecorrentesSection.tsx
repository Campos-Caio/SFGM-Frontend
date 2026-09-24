import { useCallback, useEffect, useId, useState, type FormEvent } from 'react';
import axios from 'axios';
import { Pencil, Plus, Power, Repeat, Trash2 } from 'lucide-react';
import { debitosRecorrentesApi } from '../../api/debitosRecorrentes';
import { extractErrorMessage } from '../../api/client';
import {
  Alert,
  Badge,
  Button,
  Card,
  CardHeader,
  Checkbox,
  ConfirmDialog,
  DataTable,
  EmptyState,
  ErrorState,
  FormField,
  Input,
  Modal,
  Select,
} from '../../components/ui';
import { SkeletonTable } from '../../components/ui/Skeleton';
import {
  DEBITO_TIPO_LABELS,
  type DebitoMembroTipo,
  type DebitoRecorrente,
  type DebitoRecorrenteInput,
} from '../../types/debito';
import { formatCurrency } from '../../utils/formatters';
import { somarValores } from '../../utils/money';

interface FormValues {
  tipo: DebitoMembroTipo | '';
  descricao: string;
  valor: string;
  ordem: string;
  ativo: boolean;
}

const emptyForm: FormValues = { tipo: '', descricao: '', valor: '', ordem: '0', ativo: true };

function toInput(item: DebitoRecorrente, ativo = item.ativo): DebitoRecorrenteInput {
  return {
    tipo: item.tipo,
    descricao: item.descricao,
    valor: item.valor,
    ativo,
    ordem: item.ordem,
  };
}

interface DebitosRecorrentesSectionProps {
  lojaId: number;
}

/**
 * Gestão dos débitos recorrentes da Loja (itens que "Gerar mensalidades" cria
 * para cada irmão ativo). Seção da LojaPage, alcançável por
 * `/loja#debitos-recorrentes`.
 */
export function DebitosRecorrentesSection({ lojaId }: DebitosRecorrentesSectionProps) {
  const formId = useId();
  const [itens, setItens] = useState<DebitoRecorrente[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modal de criação/edição
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<DebitoRecorrente | null>(null);
  const [form, setForm] = useState<FormValues>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Alternar ativo
  const [togglingId, setTogglingId] = useState<number | null>(null);

  // Exclusão
  const [deleteTarget, setDeleteTarget] = useState<DebitoRecorrente | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  // 409: o item já gerou débitos e não pode ser excluído (só desativado).
  const [deleteConflict, setDeleteConflict] = useState(false);

  const loadItens = useCallback(() => {
    setLoading(true);
    setLoadError(null);
    debitosRecorrentesApi
      .list(lojaId)
      .then(setItens)
      .catch((err) => setLoadError(extractErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [lojaId]);

  useEffect(() => {
    loadItens();
  }, [loadItens]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setFormError(null);
    setFormOpen(true);
  }

  function openEdit(item: DebitoRecorrente) {
    setEditing(item);
    setForm({
      tipo: item.tipo,
      descricao: item.descricao,
      valor: item.valor,
      ordem: String(item.ordem),
      ativo: item.ativo,
    });
    setFormError(null);
    setFormOpen(true);
  }

  function closeForm() {
    if (saving) return;
    setFormOpen(false);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!form.tipo) return;
    setSaving(true);
    setFormError(null);
    const payload: DebitoRecorrenteInput = {
      tipo: form.tipo,
      descricao: form.descricao.trim(),
      valor: form.valor,
      ativo: form.ativo,
      ordem: Number(form.ordem),
    };
    try {
      if (editing) {
        await debitosRecorrentesApi.update(lojaId, editing.id, payload);
        setSuccessMessage(`Débito recorrente "${payload.descricao}" atualizado.`);
      } else {
        await debitosRecorrentesApi.create(lojaId, payload);
        setSuccessMessage(`Débito recorrente "${payload.descricao}" cadastrado.`);
      }
      setActionError(null);
      setFormOpen(false);
      loadItens();
    } catch (err) {
      setFormError(extractErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  /** Alterna `ativo` via PUT (corpo completo). Devolve a mensagem de erro, ou null em caso de sucesso. */
  async function setAtivo(item: DebitoRecorrente, ativo: boolean): Promise<string | null> {
    setTogglingId(item.id);
    setActionError(null);
    setSuccessMessage(null);
    try {
      await debitosRecorrentesApi.update(lojaId, item.id, toInput(item, ativo));
      setSuccessMessage(
        `Débito recorrente "${item.descricao}" ${ativo ? 'ativado' : 'desativado'}.`
      );
      loadItens();
      return null;
    } catch (err) {
      return extractErrorMessage(err);
    } finally {
      setTogglingId(null);
    }
  }

  async function handleToggle(item: DebitoRecorrente) {
    const erro = await setAtivo(item, !item.ativo);
    if (erro) setActionError(erro);
  }

  function openDelete(item: DebitoRecorrente) {
    setDeleteTarget(item);
    setDeleteError(null);
    setDeleteConflict(false);
  }

  function closeDelete() {
    if (deleting) return;
    setDeleteTarget(null);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    setDeleteConflict(false);
    try {
      await debitosRecorrentesApi.remove(lojaId, deleteTarget.id);
      setSuccessMessage(`Débito recorrente "${deleteTarget.descricao}" excluído.`);
      setActionError(null);
      setDeleteTarget(null);
      loadItens();
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        setDeleteConflict(true);
      }
      setDeleteError(extractErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  }

  async function handleDesativarFromDelete() {
    if (!deleteTarget) return;
    const erro = await setAtivo(deleteTarget, false);
    if (erro) {
      setDeleteError(`Não foi possível desativar. ${erro}`);
    } else {
      setDeleteTarget(null);
    }
  }

  const ativos = (itens ?? []).filter((i) => i.ativo);
  const totalAtivos = somarValores(ativos.map((i) => i.valor));

  let content;
  if (loading && itens === null) {
    content = <SkeletonTable columns={6} rows={3} />;
  } else if (loadError) {
    content = <ErrorState message={loadError} onRetry={loadItens} />;
  } else if (!itens || itens.length === 0) {
    content = (
      <EmptyState
        icon={Repeat}
        title="Nenhum débito recorrente cadastrado"
        description="Sem itens ativos não é possível gerar mensalidades. Cadastre ao menos um item (ex.: Mensalidade) para que seja cobrado de cada irmão ativo."
        action={
          <Button icon={Plus} onClick={openCreate}>
            Novo débito recorrente
          </Button>
        }
      />
    );
  } else {
    content = (
      <>
        <DataTable
          rowKey={(i) => i.id}
          rows={itens}
          columns={[
            { header: 'Descrição', wrap: true, render: (i) => i.descricao },
            { header: 'Tipo', render: (i) => DEBITO_TIPO_LABELS[i.tipo] },
            { header: 'Valor', align: 'right', render: (i) => formatCurrency(i.valor) },
            { header: 'Ordem', align: 'right', render: (i) => i.ordem },
            {
              header: 'Situação',
              render: (i) => (
                <Badge variant={i.ativo ? 'success' : 'neutral'} dot>
                  {i.ativo ? 'Ativo' : 'Inativo'}
                </Badge>
              ),
            },
            {
              header: 'Ações',
              align: 'right',
              render: (i) => (
                <div className="flex justify-end gap-1">
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={Pencil}
                    onClick={() => openEdit(i)}
                    aria-label={`Editar ${i.descricao}`}
                  >
                    Editar
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={Power}
                    onClick={() => handleToggle(i)}
                    disabled={togglingId === i.id}
                    aria-label={`${i.ativo ? 'Desativar' : 'Ativar'} ${i.descricao}`}
                  >
                    {i.ativo ? 'Desativar' : 'Ativar'}
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={Trash2}
                    onClick={() => openDelete(i)}
                    aria-label={`Excluir ${i.descricao}`}
                  >
                    Excluir
                  </Button>
                </div>
              ),
            },
          ]}
        />
        <p className="mt-3 mb-0 text-right text-sm text-slate-700">
          {ativos.length > 0 ? (
            <>
              Total por irmão (itens ativos):{' '}
              <span className="font-semibold tabular-nums">{formatCurrency(totalAtivos)}</span>
            </>
          ) : (
            <span className="text-amber-700">
              Nenhum item ativo: não é possível gerar mensalidades.
            </span>
          )}
        </p>
      </>
    );
  }

  return (
    <div id="debitos-recorrentes" className="mt-6 scroll-mt-6">
      <Card>
        <CardHeader
          title="Débitos recorrentes"
          description="Itens cobrados de cada irmão ativo ao gerar mensalidades (ex.: Mensalidade, Cotização)."
          actions={
            itens && itens.length > 0 ? (
              <Button icon={Plus} onClick={openCreate}>
                Novo débito recorrente
              </Button>
            ) : undefined
          }
        />
        {successMessage && <Alert variant="success">{successMessage}</Alert>}
        {actionError && <Alert variant="error">{actionError}</Alert>}
        {content}
      </Card>

      <Modal
        open={formOpen}
        title={editing ? 'Editar débito recorrente' : 'Novo débito recorrente'}
        description="Alterações não afetam débitos já gerados, apenas as próximas gerações."
        onClose={closeForm}
        footer={
          <>
            <Button variant="secondary" type="button" onClick={closeForm} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" form={formId} disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </>
        }
      >
        <form id={formId} onSubmit={handleSubmit}>
          {formError && <Alert variant="error">{formError}</Alert>}
          <FormField label="Tipo" htmlFor="recorrente_tipo" required>
            <Select
              id="recorrente_tipo"
              value={form.tipo}
              onChange={(e) => setForm({ ...form, tipo: e.target.value as DebitoMembroTipo })}
              required
            >
              <option value="" disabled>
                Selecione...
              </option>
              {Object.entries(DEBITO_TIPO_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Descrição" htmlFor="recorrente_descricao" required>
            <Input
              id="recorrente_descricao"
              value={form.descricao}
              maxLength={255}
              onChange={(e) => setForm({ ...form, descricao: e.target.value })}
              required
            />
          </FormField>
          <FormField label="Valor (R$)" htmlFor="recorrente_valor" required>
            <Input
              id="recorrente_valor"
              type="number"
              step="0.01"
              min="0.01"
              max="9999999999.99"
              value={form.valor}
              onChange={(e) => setForm({ ...form, valor: e.target.value })}
              required
            />
          </FormField>
          <FormField
            label="Ordem"
            htmlFor="recorrente_ordem"
            required
            hint="Ordem de geração e exibição (menor primeiro)."
          >
            <Input
              id="recorrente_ordem"
              type="number"
              step="1"
              min="0"
              value={form.ordem}
              onChange={(e) => setForm({ ...form, ordem: e.target.value })}
              required
            />
          </FormField>
          <Checkbox
            id="recorrente_ativo"
            label="Ativo"
            hint="Somente itens ativos são gerados nas mensalidades."
            checked={form.ativo}
            onChange={(e) => setForm({ ...form, ativo: e.target.checked })}
            className="mb-0"
          />
        </form>
      </Modal>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Excluir débito recorrente"
        confirmLabel={deleting ? 'Excluindo...' : 'Excluir'}
        confirmDisabled={deleting || deleteConflict}
        confirmIcon={Trash2}
        onConfirm={handleDelete}
        onCancel={closeDelete}
      >
        <p className="m-0">
          Deseja realmente excluir o débito recorrente <strong>{deleteTarget?.descricao}</strong>? Esta ação
          não pode ser desfeita.
        </p>
        {deleteError && (
          <Alert variant={deleteConflict ? 'warning' : 'error'} className="mt-4 mb-0">
            {deleteError}
            {deleteConflict && deleteTarget?.ativo && (
              <div className="mt-3">
                <p className="m-0 mb-2">Você pode desativá-lo para que não seja mais gerado.</p>
                <Button
                  size="sm"
                  icon={Power}
                  onClick={handleDesativarFromDelete}
                  disabled={togglingId === deleteTarget.id}
                >
                  Desativar
                </Button>
              </div>
            )}
          </Alert>
        )}
      </ConfirmDialog>
    </div>
  );
}

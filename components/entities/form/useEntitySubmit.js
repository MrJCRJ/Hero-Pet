import { useCallback, useState } from "react";

// Responsável por enviar payload de entidade (create/update) e reportar estado
export function useEntitySubmit({ push }) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const submit = useCallback(async ({ form, editingId }) => {
    if (submitting) return { ok: false, error: "SUBMIT_IN_PROGRESS" };
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        name: form.nome.trim(),
        entity_type: form.entityType === "client" ? "PF" : "PJ",
        document_digits: form.documento,
        document_pending: form.documento_pendente,
        cep: form.cep || undefined,
        telefone: form.telefone || undefined,
        email: form.email || undefined,
        numero: form.numero || undefined,
        complemento: form.complemento || undefined,
        ativo: form.ativo,
      };
      let url = editingId ? `/api/v1/entities/${editingId}` : "/api/v1/entities";
      if (typeof window === "undefined" && url.startsWith("/")) {
        url = `http://localhost:3000${url}`;
      }
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (res.status === 409) {
          throw new Error(data.error || "Já existe uma entidade com este documento.");
        }
        throw new Error(
          data.error || `Falha ao ${editingId ? "atualizar" : "salvar"} (status ${res.status})`,
        );
      }
      return { ok: true };
    } catch (e) {
      const msg = e.message || "Erro desconhecido";
      setError(msg);
      push?.(msg, { type: "error", timeout: 5000 });
      return { ok: false, error: msg };
    } finally {
      setSubmitting(false);
    }
  }, [submitting, push]);

  return { submit, submitting, error, setError };
}

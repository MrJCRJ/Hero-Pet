// components/admin/AccessForm.js
export function AccessForm({
  accessCode,
  setAccessCode,
  onSubmit,
  incorrectCode,
}) {
  return (
    <div className="bg-[var(--color-bg-secondary)] rounded-lg shadow-md p-4 max-w-xs mx-auto text-center">
      <h2 className="text-base font-semibold mb-2">Acesso Administrativo</h2>
      <p className="mb-3 text-sm">Digite o código de acesso:</p>
      <form onSubmit={onSubmit} className="flex flex-col gap-2">
        <input
          type="password"
          value={accessCode}
          onChange={(e) => setAccessCode(e.target.value)}
          placeholder="Código"
          autoComplete="off"
          className="border rounded-md p-1.5 text-sm focus:border-[var(--color-accent)] focus:ring-[var(--color-accent)] focus:ring-1 outline-none"
        />
        <button
          type="submit"
          className="bg-[var(--color-accent)] rounded-md py-1.5 text-sm font-semibold hover:bg-[var(--color-accent-hover)]"
        >
          Acessar
        </button>
      </form>
      {incorrectCode && (
        <p className="text-red-500 mt-2 text-xs">
          Código incorreto. Tente novamente.
        </p>
      )}
    </div>
  );
}

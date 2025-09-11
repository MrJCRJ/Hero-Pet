// 🔹 Componente de formulário de acesso
export function AccessForm({
  accessCode,
  setAccessCode,
  onSubmit,
  incorrectCode,
}) {
  return (
    <div className="bg-white rounded-lg shadow p-4 max-w-xs mx-auto text-center">
      <h2 className="text-base font-semibold mb-2">Acesso Administrativo</h2>
      <p className="text-gray-600 mb-3 text-sm">Digite o código de acesso:</p>
      <form onSubmit={onSubmit} className="flex flex-col gap-2">
        <input
          type="password"
          value={accessCode}
          onChange={(e) => setAccessCode(e.target.value)}
          placeholder="Código"
          autoComplete="off"
          className="border rounded-md p-1.5 text-sm"
        />
        <button
          type="submit"
          className="bg-indigo-600 text-white rounded-md py-1.5 text-sm font-semibold hover:bg-indigo-700"
        >
          Acessar
        </button>
      </form>
      {incorrectCode && (
        <p className="text-red-600 mt-2 text-xs">
          Código incorreto. Tente novamente.
        </p>
      )}
    </div>
  );
}

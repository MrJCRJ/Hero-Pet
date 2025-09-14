// components/ui/Form.js
// Componente unificado para container e campos de formulário

export function FormContainer({ title, children, ...props }) {
  return (
    <form className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg shadow-md p-6 max-w-lg mx-auto mt-4" {...props}>
      <h2 className="text-xl font-bold mb-4 text-[var(--color-accent)]">{title}</h2>
      {children}
    </form>
  );
}

export function FormField({ label, name, value, onChange, type = "text", placeholder = "", required = false, ...props }) {
  return (
    <div>
      <label className="block text-[var(--color-text-secondary)] mb-1 font-medium" htmlFor={name}>
        {label}
      </label>
      <input
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        type={type}
        placeholder={placeholder}
        required={required}
        className="w-full border border-[var(--color-border)] rounded px-3 py-2 focus:outline-none focus:border-[var(--color-accent)] bg-transparent text-[var(--color-text-primary)]"
        {...props}
      />
    </div>
  );
}

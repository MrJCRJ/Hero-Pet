// components/ui/Form.js
// Componente unificado para container e campos de formulário

export function FormContainer({ title, children, onSubmit, ...props }) {
  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSubmit) {
      onSubmit(e);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-xl shadow-lg p-7 max-w-[1024px] w-full mx-auto mt-4"
      {...props}
    >
      <div className="max-w-full">
        <h2 className="text-xl font-bold mb-2 border-b border-[var(--color-border)] pb-2">
          {title}
        </h2>
        <div className="max-w-full overflow-x-auto space-y-6 p-1.5">
          {children}
        </div>
      </div>
    </form>
  );
}

export function FormField({
  label,
  name,
  value,
  onChange,
  type = "text",
  placeholder = "",
  required = false,
  ...props
}) {
  return (
    <div className="flex flex-col gap-1 w-full min-w-[200px]">
      <label htmlFor={name} className="text-xs font-medium text-[var(--color-text-secondary)] tracking-wide">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        type={type}
        placeholder={placeholder}
        required={required}
        autoComplete="on"
        className="py-2 px-3 w-full text-sm bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-md text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)] transition disabled:opacity-60 disabled:cursor-not-allowed"
        {...props}
      />
    </div>
  );
}

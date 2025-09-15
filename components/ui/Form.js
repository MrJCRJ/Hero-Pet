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
  placeholder = " ",
  required = false,
  ...props
}) {
  return (
    <div className="relative z-0 w-full mb-1 group min-w-[200px]">
      <input
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        type={type}
        placeholder={placeholder}
        required={required}
        autoComplete="on"
        className="block py-2 px-3 w-full text-sm bg-transparent border-0 border-b-2 border-[var(--color-border)] appearance-none text-[var(--color-text-primary)] focus:outline-none focus:ring-0 focus:border-[var(--color-accent)] peer autofill:!bg-[var(--color-bg-secondary)] autofill:!text-[var(--color-text-primary)] z-10"
        {...props}
      />
      <label
        htmlFor={name}
        className="peer-focus:font-medium absolute text-sm text-[var(--color-text-secondary)] duration-500 transform -translate-y-6 scale-75 top-3 z-20 origin-[0] peer-focus:start-0 rtl:peer-focus:translate-x-1/4 peer-focus:text-[var(--color-accent)] peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6"
      >
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
    </div>
  );
}

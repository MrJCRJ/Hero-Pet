/* eslint-disable no-unused-vars -- param names in type definitions */
import React, { type FormEvent, type ChangeEvent } from "react";

interface FormContainerProps {
  title: string;
  children: React.ReactNode;
  onSubmit?: (e: FormEvent<HTMLFormElement>) => void;
  [key: string]: unknown;
}

export function FormContainer({ title, children, onSubmit, ...props }: FormContainerProps) {
  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (onSubmit) onSubmit(e);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-xl shadow-lg p-7 max-w-[1024px] w-full mx-auto mt-4"
      {...props}
    >
      <div className="max-w-full">
        <h2 className="text-xl font-bold mb-1 border-b border-[var(--color-border)] pb-2">
          {title}
        </h2>
        <div className="max-w-full overflow-x-auto space-y-6 p-1.5">
          {children}
        </div>
      </div>
    </form>
  );
}

interface FormFieldProps {
  label: string;
  name: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  required?: boolean;
  pattern?: string;
  maxLength?: number;
  [key: string]: unknown;
}

export function FormField({
  label,
  name,
  value,
  onChange,
  type = "text",
  required = false,
  pattern,
  ...props
}: FormFieldProps) {
  return (
    <div className="relative z-0 w-full mb-1.5 group min-w-[100px]">
      <input
        type={type}
        name={name}
        id={name}
        value={value}
        onChange={onChange}
        pattern={pattern}
        required={required}
        className="block py-2.5 px-4 pt-3 pb-1 w-full text-sm text-[var(--color-text-primary)] border-0 border-b-2 border-[var(--color-border)] appearance-none focus:outline-none focus:ring-0 focus:border-[var(--color-accent)] peer transition-colors duration-500"
        placeholder=" "
        autoComplete="on"
        {...props}
      />
      <label
        htmlFor={name}
        className="absolute text-sm text-[var(--color-text-secondary)] duration-500 -translate-y-6 scale-80 top-3 -z-0 origin-[0] peer-focus:start-0 peer-focus:text-[var(--color-accent)] peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-85 peer-focus:-translate-y-6"
      >
        {label} {required && <span className="text-red-500">*</span>}
      </label>
    </div>
  );
}

interface FloatingFormFieldProps {
  label: string;
  name: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  pattern?: string;
  required?: boolean;
  [key: string]: unknown;
}

export function FloatingFormField({
  label,
  name,
  value,
  onChange,
  type = "text",
  pattern,
  required = false,
  ...props
}: FloatingFormFieldProps) {
  return (
    <FormField
      label={label}
      name={name}
      value={value}
      onChange={onChange}
      type={type}
      pattern={pattern}
      required={required}
      {...props}
    />
  );
}

import { useId, type SelectHTMLAttributes } from 'react';
import { cn } from '../../utils';
import { Field } from './Field';
import { controlBaseClass, controlErrorClass } from './fieldStyles';

export type SelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  hint?: string;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
};

export function Select({
  id,
  label,
  hint,
  error,
  options,
  placeholder,
  className,
  required,
  ...props
}: SelectProps) {
  const generatedId = useId();
  const selectId = id ?? generatedId;

  return (
    <Field
      id={selectId}
      label={label}
      hint={hint}
      error={error}
      required={required}
    >
      <div className="relative">
        <select
          id={selectId}
          required={required}
          aria-invalid={Boolean(error)}
          className={cn(
            controlBaseClass,
            'h-10 appearance-none pr-10',
            error && controlErrorClass,
            className,
          )}
          {...props}
        >
          {placeholder ? (
            <option value="" disabled>
              {placeholder}
            </option>
          ) : null}
          {options.map((option) => (
            <option
              key={option.value}
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[var(--color-fg-subtle)]">
          <ChevronIcon />
        </span>
      </div>
    </Field>
  );
}

function ChevronIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" aria-hidden="true">
      <path
        d="M5 7.5 10 12.5 15 7.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

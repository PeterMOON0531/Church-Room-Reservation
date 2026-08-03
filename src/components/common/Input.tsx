import { useId, type InputHTMLAttributes } from 'react';
import { cn } from '../../utils';
import { Field } from './Field';
import { controlBaseClass, controlErrorClass } from './fieldStyles';

type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> & {
  label?: string;
  hint?: string;
  error?: string;
  inputSize?: 'sm' | 'md' | 'lg';
};

const sizeClass = {
  sm: 'h-8 text-xs',
  md: 'h-10',
  lg: 'h-11',
} as const;

export function Input({
  id,
  label,
  hint,
  error,
  className,
  inputSize = 'md',
  required,
  ...props
}: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <Field
      id={inputId}
      label={label}
      hint={hint}
      error={error}
      required={required}
    >
      <input
        id={inputId}
        required={required}
        aria-invalid={Boolean(error)}
        className={cn(
          controlBaseClass,
          sizeClass[inputSize],
          error && controlErrorClass,
          className,
        )}
        {...props}
      />
    </Field>
  );
}

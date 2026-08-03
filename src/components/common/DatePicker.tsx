import { useId, type InputHTMLAttributes } from 'react';
import { cn } from '../../utils';
import { Field } from './Field';
import { controlBaseClass, controlErrorClass } from './fieldStyles';

type DatePickerProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type' | 'size'
> & {
  label?: string;
  hint?: string;
  error?: string;
};

export function DatePicker({
  id,
  label,
  hint,
  error,
  className,
  required,
  ...props
}: DatePickerProps) {
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
        type="date"
        required={required}
        aria-invalid={Boolean(error)}
        className={cn(
          controlBaseClass,
          'h-10',
          error && controlErrorClass,
          className,
        )}
        {...props}
      />
    </Field>
  );
}

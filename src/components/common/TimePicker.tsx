import { useId, type InputHTMLAttributes } from 'react';
import { cn } from '../../utils';
import { Field } from './Field';
import { controlBaseClass, controlErrorClass } from './fieldStyles';

type TimePickerProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type' | 'size'
> & {
  label?: string;
  hint?: string;
  error?: string;
};

export function TimePicker({
  id,
  label,
  hint,
  error,
  className,
  required,
  ...props
}: TimePickerProps) {
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
        type="time"
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

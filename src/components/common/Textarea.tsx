import { useId, type TextareaHTMLAttributes } from 'react';
import { cn } from '../../utils';
import { Field } from './Field';
import { controlBaseClass, controlErrorClass } from './fieldStyles';

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  hint?: string;
  error?: string;
};

export function Textarea({
  id,
  label,
  hint,
  error,
  className,
  required,
  rows = 4,
  ...props
}: TextareaProps) {
  const generatedId = useId();
  const textareaId = id ?? generatedId;

  return (
    <Field
      id={textareaId}
      label={label}
      hint={hint}
      error={error}
      required={required}
    >
      <textarea
        id={textareaId}
        rows={rows}
        required={required}
        aria-invalid={Boolean(error)}
        className={cn(
          controlBaseClass,
          'min-h-24 resize-y py-2.5 leading-relaxed',
          error && controlErrorClass,
          className,
        )}
        {...props}
      />
    </Field>
  );
}

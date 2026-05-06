import { useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";

interface EditableFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  multiline?: boolean;
  rows?: number;
  label?: string;
  labelClassName?: string;
  autoResize?: boolean;
  onBlur?: () => void;
  disabled?: boolean;
}

export default function EditableField({
  value,
  onChange,
  placeholder = "Click to type...",
  className,
  multiline = false,
  rows = 3,
  label,
  labelClassName,
  autoResize = true,
  onBlur,
  disabled = false,
}: EditableFieldProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const resize = useCallback(() => {
    if (autoResize && textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [autoResize]);

  useEffect(() => {
    resize();
  }, [value, resize]);

  const baseClass = cn(
    "planner-field",
    disabled && "opacity-50 cursor-not-allowed pointer-events-none",
    className
  );

  return (
    <div className="w-full">
      {label && (
        <span className={cn("text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 block", labelClassName)}>
          {label}
        </span>
      )}
      {multiline ? (
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            resize();
          }}
          onBlur={onBlur}
          placeholder={placeholder}
          rows={rows}
          disabled={disabled}
          className={cn(baseClass, "overflow-hidden")}
          style={{ minHeight: `${rows * 1.5}rem` }}
        />
      ) : (
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          disabled={disabled}
          className={baseClass}
        />
      )}
    </div>
  );
}

// Inline editable text (looks like static text until clicked)
interface InlineEditProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  textClassName?: string;
  onBlur?: () => void;
}

export function InlineEdit({ value, onChange, placeholder = "Click to edit", className, textClassName, onBlur }: InlineEditProps) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      placeholder={placeholder}
      className={cn(
        "bg-transparent border-b border-transparent hover:border-border focus:border-primary",
        "focus:outline-none transition-colors w-full",
        textClassName,
        className
      )}
    />
  );
}

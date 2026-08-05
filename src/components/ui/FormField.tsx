import type { ComponentProps, ReactNode } from "react";

interface FieldProps {
  label: string;
  htmlFor?: string;
  children: ReactNode;
  hint?: string;
}

export function Field({ label, htmlFor, children, hint }: FieldProps) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-xs font-medium text-text-secondary uppercase tracking-wider mb-1.5">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-text-muted">{hint}</p>}
    </div>
  );
}

const inputBase =
  "w-full h-10 px-3 text-sm bg-surface border border-border rounded-xl text-text-primary placeholder:text-text-muted/60 focus:outline-none focus:border-accent/60 focus:ring-2 focus:ring-accent/20 transition-all";

type InputProps = ComponentProps<"input">;
export function TextInput(props: InputProps) {
  return <input {...props} className={`${inputBase} ${props.className ?? ""}`} />;
}

type SelectProps = ComponentProps<"select">;
export function SelectInput(props: SelectProps) {
  return (
    <select {...props} className={`${inputBase} [&>option]:bg-zinc-900 [&>option]:text-white ${props.className ?? ""}`}>
      {props.children}
    </select>
  );
}

type TextAreaProps = ComponentProps<"textarea">;
export function TextArea(props: TextAreaProps) {
  return (
    <textarea
      {...props}
      className={`${inputBase} h-auto py-2.5 min-h-[80px] resize-y ${props.className ?? ""}`}
    />
  );
}

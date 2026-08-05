import React, { useState, useRef, useEffect, type ComponentProps, type ReactNode } from "react";
import { ChevronDown, Check } from "lucide-react";

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

export interface SelectOption {
  value: string;
  label: string;
}

interface CustomSelectProps {
  id?: string;
  value: string;
  onChange: (e: { target: { value: string } }) => void;
  options: (SelectOption | string)[];
  placeholder?: string;
  className?: string;
}

export function CustomSelect({
  id,
  value,
  onChange,
  options,
  placeholder = "Select an option",
  className = "",
}: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const formattedOptions: SelectOption[] = options.map((opt) =>
    typeof opt === "string" ? { value: opt, label: opt } : opt,
  );

  const selectedOption = formattedOptions.find((o) => String(o.value) === String(value));

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      <button
        id={id}
        type="button"
        onClick={() => setOpen(!open)}
        className={`${inputBase} flex items-center justify-between text-left cursor-pointer`}
      >
        <span className={selectedOption ? "text-text-primary font-medium truncate" : "text-text-muted truncate"}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown size={16} className={`text-text-muted transition-transform duration-200 shrink-0 ml-2 ${open ? "rotate-180 text-accent" : ""}`} />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 max-h-60 overflow-y-auto bg-[#18181b] border border-border rounded-xl shadow-2xl py-1 animate-scale-in">
          {formattedOptions.map((opt) => {
            const isSelected = String(opt.value) === String(value);
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange({ target: { value: opt.value } });
                  setOpen(false);
                }}
                className={`w-full px-3 py-2.5 text-left text-sm flex items-center justify-between transition-colors cursor-pointer ${
                  isSelected
                    ? "bg-accent/15 text-accent font-medium"
                    : "text-white hover:bg-zinc-800 hover:text-white"
                }`}
              >
                <span className="truncate">{opt.label}</span>
                {isSelected && <Check size={15} className="text-accent shrink-0 ml-2" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

type SelectProps = ComponentProps<"select">;
export function SelectInput(props: SelectProps) {
  const parsedOptions: SelectOption[] = [];
  React.Children.forEach(props.children, (child) => {
    if (React.isValidElement(child) && child.type === "option") {
      const val = String(child.props.value ?? child.props.children ?? "");
      const lbl = String(child.props.children ?? val);
      parsedOptions.push({ value: val, label: lbl });
    }
  });

  if (parsedOptions.length > 0) {
    return (
      <CustomSelect
        id={props.id}
        value={String(props.value ?? "")}
        onChange={(e) => {
          if (props.onChange) {
            props.onChange(e as unknown as React.ChangeEvent<HTMLSelectElement>);
          }
        }}
        options={parsedOptions}
        className={props.className}
      />
    );
  }

  return (
    <select
      {...props}
      className={`${inputBase} bg-[#18181b] text-white [&>option]:bg-[#18181b] [&>option]:text-white ${props.className ?? ""}`}
      style={{ colorScheme: "dark", backgroundColor: "#18181b", color: "#ffffff" }}
    >
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

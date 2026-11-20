"use client";

import { Check, ChevronDown, X } from "lucide-react";
import { useId, useRef, useState } from "react";
import type { TaxonomyOption } from "@/lib/exercise-classification";
import { normalizeTerm } from "@/lib/exercise-classification";
import { cn } from "@/lib/utils";

export function TaxonomySelect({ label, options, selectedOptions = options, value, onChange, multiple = true, placeholder = "Search options…", error, description, disabled = false }: {
  label: string; options: TaxonomyOption[]; selectedOptions?: TaxonomyOption[]; value: string[]; onChange: (values: string[]) => void;
  multiple?: boolean; placeholder?: string; error?: string; description?: string; disabled?: boolean;
}) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const visible = options.filter((option) => normalizeTerm([option.label, option.value, ...(option.aliases ?? [])].join(" ")).includes(normalizeTerm(query)));
  const activeIndex = Math.min(cursor, visible.length - 1);
  function select(option: TaxonomyOption) {
    onChange(value.includes(option.value) ? value.filter((item) => item !== option.value) : multiple ? [...value, option.value] : [option.value]);
    setQuery(""); setCursor(0);
    if (!multiple) setOpen(false);
    input.current?.focus();
  }
  return (
    <div className="relative min-w-0" onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
      <label htmlFor={id} className="mb-2 block text-sm font-medium text-charcoal-950">{label}</label>
      <div className={cn("rounded-2xl border bg-white/80 p-2 shadow-inner-soft focus-within:ring-4 focus-within:ring-bronze-100", error ? "border-red-500" : "border-stone-200", disabled && "opacity-60")}>
        {value.length > 0 && (
          <div className="mb-1 flex flex-wrap gap-1.5">
            {value.map((selected) => (
              <button key={selected} type="button" disabled={disabled} onClick={() => onChange(value.filter((item) => item !== selected))}
                aria-label={`Remove ${selectedOptions.find((option) => option.value === selected)?.label ?? selected} from ${label}`}
                className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-stone-100 px-2.5 py-1 text-left text-xs font-medium text-charcoal-950 hover:bg-stone-200 focus-visible:outline-2 focus-visible:outline-bronze-500">
                <span className="break-words">{selectedOptions.find((option) => option.value === selected)?.label ?? selected}</span><X aria-hidden="true" className="size-3 shrink-0" />
              </button>
            ))}
          </div>
        )}
        <div className="flex items-center gap-1">
          <input ref={input} id={id} role="combobox" autoComplete="off" disabled={disabled}
            aria-expanded={open} aria-controls={`${id}-options`} aria-autocomplete="list"
            aria-activedescendant={open && activeIndex >= 0 ? `${id}-option-${activeIndex}` : undefined}
            aria-invalid={!!error} aria-describedby={error || description ? `${id}-help` : undefined}
            value={query} placeholder={placeholder} className="h-8 w-full min-w-0 bg-transparent px-2 text-sm text-charcoal-950 outline-none"
            onFocus={() => setOpen(true)} onClick={() => setOpen(true)}
            onChange={(event) => { setQuery(event.target.value); setCursor(0); setOpen(true); }}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                event.preventDefault(); setOpen(true);
                setCursor((current) => Math.max(0, Math.min(visible.length - 1, open ? current + (event.key === "ArrowDown" ? 1 : -1) : 0)));
              } else if (event.key === "Enter") {
                event.preventDefault();
                if (open && visible[activeIndex]) select(visible[activeIndex]); else setOpen(true);
              } else if (event.key === "Escape" && open) {
                event.preventDefault(); event.stopPropagation(); setOpen(false);
              } else if (event.key === "Backspace" && !query && value.length) {
                event.preventDefault(); onChange(value.slice(0, -1));
              }
            }} />
          <button type="button" tabIndex={-1} disabled={disabled} aria-label={`Show ${label} options`} onClick={() => { input.current?.focus(); setOpen(!open); }} className="p-1 text-stone-500"><ChevronDown aria-hidden="true" className="size-4" /></button>
        </div>
      </div>
      {(error || description) && <p id={`${id}-help`} className={cn("mt-1.5 text-xs leading-5", error ? "text-red-700" : "text-stone-500")}>{error ?? description}</p>}
      <span className="sr-only" role="status">{value.length} selected in {label}</span>
      {open && !disabled && (
        <div id={`${id}-options`} role="listbox" aria-label={label} aria-multiselectable={multiple}
          className="absolute inset-x-0 z-[60] mt-1 max-h-56 overflow-y-auto rounded-2xl border border-stone-200 bg-ivory-50 p-1.5 shadow-xl">
          {visible.map((option, index) => (
            <button key={option.value} id={`${id}-option-${index}`} type="button" role="option" aria-selected={value.includes(option.value)} tabIndex={-1}
              onMouseDown={(event) => event.preventDefault()} onClick={() => select(option)}
              ref={(element) => { if (open && index === activeIndex) element?.scrollIntoView({ block: "nearest" }); }}
              className={cn("flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left text-sm text-charcoal-950", index === activeIndex && "bg-stone-100", "hover:bg-stone-200")}>
              {option.label}{value.includes(option.value) && <Check aria-hidden="true" className="size-4 shrink-0" />}
            </button>
          ))}
          {!visible.length && <p className="px-3 py-4 text-sm text-stone-500">No matching options.</p>}
        </div>
      )}
    </div>
  );
}

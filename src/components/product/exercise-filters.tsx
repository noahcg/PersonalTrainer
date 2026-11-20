"use client";

import { X } from "lucide-react";
import { useId, useState } from "react";
import { TaxonomySelect } from "@/components/ui/taxonomy-select";
import { changeFacet, emptyFacets, optionLabel, taxonomy, type ExerciseFacets, type TaxonomyOption } from "@/lib/exercise-classification";

export function ExerciseFilters({ value, onChange, onClear, count }: { value: ExerciseFacets; onChange: (value: ExerciseFacets) => void; onClear: () => void; count: number }) {
  const [expanded, setExpanded] = useState(false);
  const id = useId();
  const groups: { key: keyof ExerciseFacets; label: string; options: TaxonomyOption[] }[] = [
    { key: "types", label: "Exercise type", options: taxonomy.types },
    { key: "focuses", label: "Movement / focus", options: taxonomy.focuses.filter((option) => !value.types.length || value.types.includes(option.type)) },
    { key: "equipment", label: "Equipment", options: taxonomy.equipment },
    { key: "muscles", label: "Muscle groups / areas", options: taxonomy.muscles },
    { key: "commonUses", label: "Common use", options: taxonomy.commonUses },
    { key: "difficulty", label: "Difficulty", options: ["Beginner", "Intermediate", "Advanced"].map((label) => ({ value: label, label })) },
  ];
  return (
    <div className="mt-4 space-y-3">
      <button type="button" aria-expanded={expanded} aria-controls={id} onClick={() => setExpanded(!expanded)} className="rounded-full border border-stone-200 bg-white px-4 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-bronze-500 sm:hidden">{expanded ? "Hide exercise filters" : "Show exercise filters"}</button>
      <div id={id} className={`${expanded ? "grid" : "hidden sm:grid"} gap-3 sm:grid-cols-2 xl:grid-cols-3`}>
        {groups.map(({ key, label, options }) => <TaxonomySelect key={key} label={label} options={options} value={value[key]} onChange={(values) => onChange(changeFacet(value, key, values))} placeholder="Any" />)}
      </div>
      <div className="flex flex-wrap items-center gap-2" aria-label="Active exercise filters">
        {groups.flatMap(({ key, label, options }) => value[key].map((id) => (
          <button key={`${key}-${id}`} type="button" onClick={() => onChange(changeFacet(value, key, value[key].filter((item) => item !== id)))} aria-label={`Clear ${label}: ${optionLabel(options, id)}`}
            className="inline-flex max-w-full items-center gap-2 rounded-full bg-charcoal-950 px-3 py-1.5 text-left text-xs text-ivory-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bronze-500">
            {label}: {optionLabel(options, id)}<X aria-hidden="true" className="size-3 shrink-0" />
          </button>
        )))}
        <span className="mr-auto text-xs text-stone-600" role="status">{count} {count === 1 ? "exercise" : "exercises"}</span>
        <button type="button" onClick={() => { onChange(emptyFacets); onClear(); }} className="rounded-full px-3 py-2 text-xs font-semibold text-bronze-700 hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-bronze-500">Clear all</button>
      </div>
    </div>
  );
}

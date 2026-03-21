"use client";
import { RecipeListItem, Label, SortOption } from "@/lib/types";
import RecipeCard from "./RecipeCard";
import LabelBadge from "./LabelBadge";
import { Search, SortAsc, Clock, X, Trash2 } from "lucide-react";
import { useState } from "react";

interface SidebarProps {
  recipes: RecipeListItem[];
  labels: Label[];
  activeId: string | null;
  sort: SortOption;
  activeLabelIds: number[];
  isAdmin?: boolean;
  onSelectRecipe: (id: string) => void;
  onSortChange: (sort: SortOption) => void;
  onToggleLabel: (id: number) => void;
  onClearFilters: () => void;
  onDeleteLabel?: (id: number) => void;
}

export default function Sidebar({
  recipes,
  labels,
  activeId,
  sort,
  activeLabelIds,
  isAdmin,
  onSelectRecipe,
  onSortChange,
  onToggleLabel,
  onClearFilters,
  onDeleteLabel,
}: SidebarProps) {
  const [search, setSearch] = useState("");

  const filtered = recipes.filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <aside className="flex flex-col h-full bg-brand-surface border-l border-brand-border w-80 flex-shrink-0 shadow-sm">
      {/* Header */}
      <div className="p-4 border-b border-brand-border bg-brand-bg">
        <h1 className="text-xl font-bold text-brand-text mb-3 flex items-center gap-2">
          <span className="text-2xl">🧑‍🍳</span>
          המתכונים שלי
        </h1>

        {/* Search */}
        <div className="relative mb-3">
          <Search size={14} className="absolute top-1/2 -translate-y-1/2 right-3 text-brand-muted" />
          <input
            type="text"
            placeholder="חיפוש מתכון..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-brand-surface border border-brand-border rounded-xl py-2 pr-9 pl-3 text-sm text-brand-text placeholder:text-brand-muted focus:outline-none focus:border-brand-accent transition-colors"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute top-1/2 -translate-y-1/2 left-3 text-brand-muted hover:text-brand-text">
              <X size={13} />
            </button>
          )}
        </div>

        {/* Sort */}
        <div className="flex gap-2">
          <button
            onClick={() => onSortChange("name")}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all font-semibold ${
              sort === "name"
                ? "bg-brand-accent border-brand-accent text-white shadow-sm"
                : "border-brand-border text-brand-muted hover:border-brand-accent hover:text-brand-accent bg-brand-surface"
            }`}
          >
            <SortAsc size={12} /> א-ב
          </button>
          <button
            onClick={() => onSortChange("created_at")}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all font-semibold ${
              sort === "created_at"
                ? "bg-brand-accent border-brand-accent text-white shadow-sm"
                : "border-brand-border text-brand-muted hover:border-brand-accent hover:text-brand-accent bg-brand-surface"
            }`}
          >
            <Clock size={12} /> לפי תאריך
          </button>
        </div>
      </div>

      {/* Label filters */}
      {labels.length > 0 && (
        <div className="px-4 py-3 border-b border-brand-border bg-brand-bg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-brand-muted font-semibold uppercase tracking-wide">סינון לפי תוויות</span>
            {activeLabelIds.length > 0 && (
              <button onClick={onClearFilters} className="text-xs text-brand-accent hover:underline flex items-center gap-1 font-semibold">
                <X size={11} /> נקה
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {labels.map((l) => (
              <div key={l.id} className="flex items-center gap-0.5">
                <LabelBadge
                  label={l}
                  active={activeLabelIds.includes(l.id)}
                  onClick={() => onToggleLabel(l.id)}
                  small
                />
                {isAdmin && onDeleteLabel && (
                  <button
                    onClick={() => onDeleteLabel(l.id)}
                    className="text-brand-muted hover:text-red-500 transition-colors p-0.5"
                    title="מחק תווית"
                  >
                    <Trash2 size={11} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recipe list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-brand-bg">
        {filtered.length === 0 ? (
          <div className="text-center text-brand-muted text-sm py-12">
            {search ? "לא נמצאו מתכונים" : "אין מתכונים עדיין"}
          </div>
        ) : (
          filtered.map((r) => (
            <RecipeCard
              key={r.id}
              recipe={r}
              active={r.id === activeId}
              onClick={() => onSelectRecipe(r.id)}
            />
          ))
        )}
      </div>

      {/* Count */}
      <div className="px-4 py-2 border-t border-brand-border text-xs text-brand-muted text-center bg-brand-surface">
        {filtered.length} מתכונים
      </div>
    </aside>
  );
}

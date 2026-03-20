"use client";
import { Recipe } from "@/lib/types";
import { Clock, Users, ExternalLink, Printer, Pencil, Trash2, X } from "lucide-react";
import StarRating from "./StarRating";
import LabelBadge from "./LabelBadge";
import Image from "next/image";
import { rateRecipe } from "@/lib/api";
import { useState } from "react";

function extractSiteName(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

interface RecipeDetailProps {
  recipe: Recipe;
  onUpdate: (updated: Recipe) => void;
  onEdit?: () => void;
  onDelete?: () => void;
  isAdmin?: boolean;
}

export default function RecipeDetail({ recipe, onUpdate, onEdit, onDelete, isAdmin }: RecipeDetailProps) {
  const [rating, setRating] = useState<number | undefined>(recipe.rating ?? undefined);
  const [ratingCount, setRatingCount] = useState(recipe.rating_count);
  const [imageExpanded, setImageExpanded] = useState(false);

  const storageKey = `recipe_rating_${recipe.id}`;

  const handleRate = async (val: number) => {
    const prev = localStorage.getItem(storageKey);
    const previousRating = prev ? parseFloat(prev) : undefined;
    try {
      const updated = await rateRecipe(recipe.id, val, previousRating);
      setRating(updated.rating ?? undefined);
      setRatingCount(updated.rating_count);
      localStorage.setItem(storageKey, String(val));
      onUpdate(updated);
    } catch (e) {
      console.error(e);
    }
  };

  const handlePrint = () => window.print();

  const sections = [
    { title: "מצרכים", content: recipe.ingredients },
    { title: "הוראות הכנה", content: recipe.instructions },
    ...(recipe.variations ? [{ title: "וריאציות", content: recipe.variations }] : []),
  ];

  return (
    <>
      {/* ======== PRINT VIEW ======== */}
      <div className="print-only hidden">
        <div className="print-page">
          <div className="print-title">{recipe.name}</div>
          <div className="print-meta">
            {recipe.prep_time_minutes && <span>⏱ {recipe.prep_time_minutes} דקות</span>}
            {recipe.servings && <span>👥 {recipe.servings} מנות</span>}
            {rating && <span className="print-stars">{"★".repeat(Math.round(rating))}{"☆".repeat(5 - Math.round(rating))} {rating.toFixed(1)}</span>}
          </div>
          {recipe.labels.length > 0 && (
            <div className="print-labels">
              {recipe.labels.map((l) => <span key={l.id} className="print-label">{l.name}</span>)}
            </div>
          )}
          <div className="print-section-title">מצרכים</div>
          <div className="print-body">{recipe.ingredients}</div>
          <div className="print-section-title">הוראות הכנה</div>
          <div className="print-body">{recipe.instructions}</div>
          {recipe.variations && (
            <>
              <div className="print-section-title">וריאציות</div>
              <div className="print-body">{recipe.variations}</div>
            </>
          )}
          {recipe.source_url && (
            <div style={{ marginTop: "1.5rem", fontSize: "0.8rem", color: "#888" }}>
              מקור: {recipe.source_url}
            </div>
          )}
        </div>
      </div>

      {/* ======== SCREEN VIEW ======== */}
      <article className="no-print h-full overflow-y-auto">
        {/* Hero image */}
        {recipe.image_url && (
          <>
            <div
              className="relative w-full h-56 rounded-2xl overflow-hidden mb-6 shadow-sm cursor-zoom-in"
              onClick={() => setImageExpanded(true)}
            >
              <Image src={recipe.image_url} alt={recipe.name} fill className="object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
            </div>
            {imageExpanded && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
                onClick={() => setImageExpanded(false)}
              >
                <button
                  className="absolute top-4 right-4 text-white bg-black/50 rounded-full p-1.5 hover:bg-black/80"
                  onClick={() => setImageExpanded(false)}
                >
                  <X size={20} />
                </button>
                <div className="relative max-w-3xl w-full max-h-[90vh]">
                  <img
                    src={recipe.image_url}
                    alt={recipe.name}
                    className="w-full h-auto max-h-[90vh] object-contain rounded-xl"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              </div>
            )}
          </>
        )}

        {/* Header card */}
        <div className="bg-brand-surface border border-brand-border rounded-2xl p-5 mb-4 shadow-sm">
          <div className="flex items-start justify-between gap-4 mb-3">
            <h1 className="text-2xl font-bold text-brand-text leading-tight">{recipe.name}</h1>
            <div className="no-print flex items-center gap-2 flex-shrink-0">
              {isAdmin && (
                <>
                  <button
                    onClick={onEdit}
                    className="flex items-center gap-1.5 text-sm text-brand-muted hover:text-brand-accent transition-colors px-3 py-1.5 rounded-xl border border-brand-border hover:border-brand-accent bg-brand-bg"
                    title="עריכה"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={onDelete}
                    className="flex items-center gap-1.5 text-sm text-red-400 hover:text-red-600 transition-colors px-3 py-1.5 rounded-xl border border-brand-border hover:border-red-300 bg-brand-bg"
                    title="מחיקה"
                  >
                    <Trash2 size={14} />
                  </button>
                </>
              )}
              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 text-sm text-brand-muted hover:text-brand-accent transition-colors px-3 py-1.5 rounded-xl border border-brand-border hover:border-brand-accent bg-brand-bg"
              >
                <Printer size={15} />
                הדפסה
              </button>
            </div>
          </div>

          {/* Meta */}
          <div className="flex flex-wrap items-center gap-4 mb-3">
            {recipe.prep_time_minutes && (
              <div className="flex items-center gap-1.5 text-brand-muted text-sm">
                <Clock size={15} className="text-brand-accent" />
                <span>{recipe.prep_time_minutes} דקות</span>
              </div>
            )}
            {recipe.servings && (
              <div className="flex items-center gap-1.5 text-brand-muted text-sm">
                <Users size={15} className="text-brand-accent" />
                <span>{recipe.servings} מנות</span>
              </div>
            )}
            {recipe.source_url && (() => {
              const isUrl = /^https?:\/\//i.test(recipe.source_url);
              return isUrl ? (
                <a
                  href={recipe.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-brand-accent text-sm hover:underline font-semibold"
                >
                  <ExternalLink size={13} />
                  מתכון של {extractSiteName(recipe.source_url)}
                </a>
              ) : (
                <span className="flex items-center gap-1 text-brand-muted text-sm">
                  <ExternalLink size={13} />
                  {recipe.source_url}
                </span>
              );
            })()}
          </div>

          {/* Labels */}
          {recipe.labels.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {recipe.labels.map((l) => (
                <LabelBadge key={l.id} label={l} small />
              ))}
            </div>
          )}
        </div>

        {/* Rating */}
        <div className="bg-brand-surface border border-brand-border rounded-2xl p-4 mb-4 shadow-sm">
          <div className="text-xs text-brand-muted mb-2 font-semibold uppercase tracking-wide">
            דרג את המתכון
          </div>
          <StarRating
            value={rating}
            count={ratingCount}
            onRate={handleRate}
            size="lg"
          />
        </div>

        {/* Content sections */}
        {sections.map((section) => (
          <section key={section.title} className="bg-brand-surface border border-brand-border rounded-2xl p-5 mb-4 shadow-sm">
            <h2 className="text-base font-bold text-brand-accent mb-3 flex items-center gap-2">
              <span className="w-1 h-4 rounded-full bg-brand-accent inline-block" />
              {section.title}
            </h2>
            <div className="text-brand-text text-sm leading-relaxed whitespace-pre-wrap pr-3 border-r-2 border-brand-card">
              {section.content}
            </div>
          </section>
        ))}

        {/* Footer */}
        <div className="mt-2 pt-3 pb-6 text-xs text-brand-muted text-center">
          עודכן: {new Date(recipe.updated_at).toLocaleDateString("he-IL")}
        </div>
      </article>
    </>
  );
}

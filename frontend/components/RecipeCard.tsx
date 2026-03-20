import { RecipeListItem } from "@/lib/types";
import { Clock, Users, Star } from "lucide-react";
import LabelBadge from "./LabelBadge";
import Image from "next/image";

interface RecipeCardProps {
  recipe: RecipeListItem;
  active: boolean;
  onClick: () => void;
}

export default function RecipeCard({ recipe, active, onClick }: RecipeCardProps) {
  return (
    <button
      onClick={onClick}
      className={`recipe-card w-full text-right rounded-2xl border transition-all duration-300 overflow-hidden group shadow-sm
        ${active
          ? "active border-brand-accent2 bg-brand-surface shadow-md"
          : "border-brand-border bg-brand-surface hover:-translate-y-1 hover:border-brand-accent2 hover:shadow-md"
        }`}
    >
      {/* Image */}
      {recipe.image_url && (
        <div className="relative w-full h-24 overflow-hidden">
          <Image
            src={recipe.image_url}
            alt={recipe.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        </div>
      )}

      <div className="p-3">
        <h3 className={`font-semibold text-sm leading-snug mb-1.5 transition-colors ${
          active ? "text-brand-accent" : "text-brand-text group-hover:text-brand-accent"
        }`}>
          {recipe.name}
        </h3>

        <div className="flex items-center gap-3 text-xs text-brand-muted mb-2">
          {recipe.prep_time_minutes && (
            <span className="flex items-center gap-1">
              <Clock size={11} />
              {recipe.prep_time_minutes} דק׳
            </span>
          )}
          {recipe.servings && (
            <span className="flex items-center gap-1">
              <Users size={11} />
              {recipe.servings}
            </span>
          )}
          {recipe.rating !== undefined && recipe.rating !== null && (
            <span className="flex items-center gap-0.5 text-brand-gold">
              <Star size={11} className="fill-brand-gold" />
              {recipe.rating.toFixed(1)}
            </span>
          )}
        </div>

        {recipe.labels.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {recipe.labels.slice(0, 3).map((l) => (
              <LabelBadge key={l.id} label={l} small />
            ))}
            {recipe.labels.length > 3 && (
              <span className="text-xs text-brand-muted">+{recipe.labels.length - 3}</span>
            )}
          </div>
        )}
      </div>
    </button>
  );
}

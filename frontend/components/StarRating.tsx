"use client";
import { useState } from "react";
import { Star } from "lucide-react";

interface StarRatingProps {
  value?: number;
  count?: number;
  onRate?: (rating: number) => void;
  size?: "sm" | "md" | "lg";
  readonly?: boolean;
}

export default function StarRating({
  value,
  count,
  onRate,
  size = "md",
  readonly = false,
}: StarRatingProps) {
  const [hovered, setHovered] = useState(0);

  const px = size === "sm" ? 14 : size === "lg" ? 24 : 18;
  const display = hovered || value || 0;

  return (
    <div className="flex items-center gap-1">
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            disabled={readonly || !onRate}
            onClick={() => onRate?.(star)}
            onMouseEnter={() => !readonly && setHovered(star)}
            onMouseLeave={() => !readonly && setHovered(0)}
            className={`transition-transform ${!readonly && onRate ? "cursor-pointer hover:scale-110" : "cursor-default"}`}
            aria-label={`דרג ${star} כוכבים`}
          >
            <Star
              size={px}
              className={`transition-colors ${
                star <= display
                  ? "fill-brand-gold text-brand-gold"
                  : "fill-transparent text-brand-border"
              }`}
            />
          </button>
        ))}
      </div>
      {count !== undefined && count > 0 && (
        <span className="text-brand-muted text-xs mr-1">
          ({count})
        </span>
      )}
      {value === undefined && count === 0 && (
        <span className="text-brand-muted text-xs">לא דורג</span>
      )}
    </div>
  );
}

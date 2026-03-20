import { Label } from "@/lib/types";

interface LabelBadgeProps {
  label: Label;
  active?: boolean;
  onClick?: () => void;
  small?: boolean;
}

export default function LabelBadge({ label, active, onClick, small }: LabelBadgeProps) {
  const base = small
    ? "text-xs px-2 py-0.5"
    : "text-sm px-3 py-1";

  if (onClick) {
    return (
      <button
        onClick={onClick}
        className={`rounded-full border font-semibold transition-all ${base} ${
          active
            ? "bg-brand-accent border-brand-accent text-white shadow-sm"
            : "bg-brand-surface border-brand-border text-brand-muted hover:border-brand-accent hover:text-brand-accent"
        }`}
      >
        {label.name}
      </button>
    );
  }

  return (
    <span
      className={`rounded-full border font-medium ${base} ${
        active
          ? "bg-brand-card border-brand-accent2 text-brand-accent"
          : "bg-brand-card border-brand-border text-brand-muted"
      }`}
    >
      {label.name}
    </span>
  );
}

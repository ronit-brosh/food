"use client";
import { useEffect, useState } from "react";
import { getDiff, syncSelected, DiffItem } from "@/lib/api";
import { X, RefreshCw } from "lucide-react";

interface Props {
  onClose: () => void;
}

export default function SyncDialog({ onClose }: Props) {
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [diff, setDiff] = useState<{ to_add: DiffItem[]; to_update: DiffItem[]; to_delete: DiffItem[] } | null>(null);
  const [selected, setSelected] = useState<{ add: Set<string>; update: Set<string>; del: Set<string> }>({
    add: new Set(), update: new Set(), del: new Set(),
  });

  useEffect(() => {
    getDiff().then((d) => {
      setDiff(d);
      setSelected({
        add: new Set(d.to_add.map((r) => r.id)),
        update: new Set(d.to_update.map((r) => r.id)),
        del: new Set(d.to_delete.map((r) => r.id)),
      });
      setLoading(false);
    });
  }, []);

  const toggle = (set: "add" | "update" | "del", id: string) => {
    setSelected((prev) => {
      const next = new Set(prev[set]);
      next.has(id) ? next.delete(id) : next.add(id);
      return { ...prev, [set]: next };
    });
  };

  const handleSync = async () => {
    setSyncing(true);
    await syncSelected([...selected.add], [...selected.update], [...selected.del]);
    setSyncing(false);
    onClose();
  };

  const total = selected.add.size + selected.update.size + selected.del.size;

  const Section = ({ title, items, color, setKey }: { title: string; items: DiffItem[]; color: string; setKey: "add" | "update" | "del" }) => (
    items.length > 0 ? (
      <div className="mb-4">
        <p className={`text-xs font-bold uppercase tracking-wide mb-2 ${color}`}>{title}</p>
        {items.map((item) => (
          <label key={item.id} className="flex items-center gap-2 py-1 cursor-pointer hover:bg-brand-bg rounded px-1">
            <input
              type="checkbox"
              checked={selected[setKey].has(item.id)}
              onChange={() => toggle(setKey, item.id)}
              className="accent-brand-accent"
            />
            <span className="text-sm text-brand-text">{item.name}</span>
          </label>
        ))}
      </div>
    ) : null
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}>
      <div className="bg-brand-surface rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-brand-border">
          <h2 className="font-bold text-brand-text text-lg">הפץ לפרודקשן</h2>
          <button onClick={onClose} className="text-brand-muted hover:text-brand-text"><X size={18} /></button>
        </div>

        <div className="p-5 max-h-96 overflow-y-auto">
          {loading ? (
            <div className="text-center text-brand-muted py-8 animate-pulse">טוען הבדלים...</div>
          ) : !diff || (diff.to_add.length + diff.to_update.length + diff.to_delete.length === 0) ? (
            <div className="text-center text-brand-muted py-8">אין הבדלים — הכל מסונכרן</div>
          ) : (
            <>
              <Section title="חדשים להוספה" items={diff.to_add} color="text-green-600" setKey="add" />
              <Section title="עודכנו מקומית" items={diff.to_update} color="text-blue-500" setKey="update" />
              <Section title="נמחקו מקומית" items={diff.to_delete} color="text-red-500" setKey="del" />
            </>
          )}
        </div>

        <div className="p-5 border-t border-brand-border flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-xl border border-brand-border text-brand-muted text-sm hover:bg-brand-bg">
            ביטול
          </button>
          <button
            onClick={handleSync}
            disabled={syncing || loading || total === 0}
            className="px-4 py-2 rounded-xl bg-brand-accent text-white text-sm font-bold hover:opacity-90 disabled:opacity-40 flex items-center gap-2"
          >
            {syncing ? <RefreshCw size={14} className="animate-spin" /> : null}
            הפץ {total > 0 ? `(${total})` : ""}
          </button>
        </div>
      </div>
    </div>
  );
}

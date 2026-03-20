"use client";
import { useState, useRef, useEffect } from "react";
import { Recipe, Label, ParsedRecipe } from "@/lib/types";
import {
  createRecipe, updateRecipe, createLabel,
  parseRecipeFromUrl, parseRecipeFromImage, parseRecipeFromText,
} from "@/lib/api";
import { X, Loader2, Link, ImageIcon, PenLine, Plus, ClipboardPaste } from "lucide-react";

interface FormData {
  name: string;
  prep_time_minutes: string;
  servings: string;
  ingredients: string;
  instructions: string;
  variations: string;
  source_url: string;
  image_url: string;
  label_ids: number[];
}

const EMPTY_FORM: FormData = {
  name: "", prep_time_minutes: "", servings: "",
  ingredients: "", instructions: "", variations: "",
  source_url: "", image_url: "", label_ids: [],
};

function recipeToForm(r: Recipe): FormData {
  return {
    name: r.name,
    prep_time_minutes: r.prep_time_minutes?.toString() ?? "",
    servings: r.servings?.toString() ?? "",
    ingredients: r.ingredients,
    instructions: r.instructions,
    variations: r.variations ?? "",
    source_url: r.source_url ?? "",
    image_url: r.image_url ?? "",
    label_ids: r.labels.map((l) => l.id),
  };
}

function parsedToForm(p: ParsedRecipe, availableLabels: Label[]): FormData {
  const suggested = p.suggested_labels ?? [];
  const label_ids = availableLabels
    .filter((l) => suggested.includes(l.name))
    .map((l) => l.id);
  return {
    name: p.name,
    prep_time_minutes: p.prep_time_minutes?.toString() ?? "",
    servings: p.servings?.toString() ?? "",
    ingredients: p.ingredients,
    instructions: p.instructions,
    variations: p.variations ?? "",
    source_url: p.source_url ?? "",
    image_url: p.image_url ?? "",
    label_ids,
  };
}

interface RecipeFormModalProps {
  recipe?: Recipe;           // if set → edit mode
  labels: Label[];
  onSave: (recipe: Recipe) => void;
  onClose: () => void;
  onLabelsChange: (labels: Label[]) => void;
}

type Mode = "manual" | "url" | "image" | "text";

export default function RecipeFormModal({
  recipe, labels, onSave, onClose, onLabelsChange,
}: RecipeFormModalProps) {
  const isEdit = !!recipe;
  const [mode, setMode] = useState<Mode>(isEdit ? "manual" : "manual");
  const [form, setForm] = useState<FormData>(recipe ? recipeToForm(recipe) : EMPTY_FORM);
  const [showFields, setShowFields] = useState(isEdit);

  const [urlInput, setUrlInput] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [pasteText, setPasteText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState("");

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const [newLabelInput, setNewLabelInput] = useState("");
  const [addingLabel, setAddingLabel] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);

  // close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const setField = (k: keyof FormData, v: string | number[]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const toggleLabel = (id: number) =>
    setField("label_ids", form.label_ids.includes(id)
      ? form.label_ids.filter((x) => x !== id)
      : [...form.label_ids, id]);

  const handleAddLabel = async () => {
    const name = newLabelInput.trim();
    if (!name) return;
    setAddingLabel(true);
    try {
      const created = await createLabel(name);
      onLabelsChange([...labels, created]);
      setField("label_ids", [...form.label_ids, created.id]);
      setNewLabelInput("");
    } finally {
      setAddingLabel(false);
    }
  };

  const handleParseUrl = async () => {
    if (!urlInput.trim()) return;
    setParsing(true);
    setParseError("");
    try {
      const parsed = await parseRecipeFromUrl(urlInput.trim());
      setForm(parsedToForm(parsed, labels));
      setShowFields(true);
    } catch (e: any) {
      setParseError(e.message ?? "שגיאה בפירסור");
    } finally {
      setParsing(false);
    }
  };

  const handleParseImage = async () => {
    if (!imageFile) return;
    setParsing(true);
    setParseError("");
    try {
      const buffer = await imageFile.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = "";
      for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
      const base64 = btoa(binary);
      const parsed = await parseRecipeFromImage(base64, imageFile.type || "image/jpeg");
      setForm(parsedToForm(parsed, labels));
      setShowFields(true);
    } catch (e: any) {
      setParseError(e.message ?? "שגיאה בפירסור");
    } finally {
      setParsing(false);
    }
  };

  const handleParseText = async () => {
    if (!pasteText.trim()) return;
    setParsing(true);
    setParseError("");
    try {
      const parsed = await parseRecipeFromText(pasteText.trim());
      setForm(parsedToForm(parsed, labels));
      setShowFields(true);
    } catch (e: any) {
      setParseError(e.message ?? "שגיאה בפירסור");
    } finally {
      setParsing(false);
    }
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.ingredients.trim() || !form.instructions.trim()) {
      setSaveError("שם, מצרכים והוראות הכנה הם שדות חובה");
      return;
    }
    setSaving(true);
    setSaveError("");
    try {
      const payload = {
        name: form.name.trim(),
        prep_time_minutes: form.prep_time_minutes ? parseInt(form.prep_time_minutes) : undefined,
        servings: form.servings ? parseInt(form.servings) : undefined,
        ingredients: form.ingredients.trim(),
        instructions: form.instructions.trim(),
        variations: form.variations.trim() || undefined,
        source_url: form.source_url.trim() || undefined,
        image_url: form.image_url.trim() || undefined,
        labels: [],
        label_ids: form.label_ids,
      };
      const saved = isEdit
        ? await updateRecipe(recipe.id, payload)
        : await createRecipe(payload);
      onSave(saved);
    } catch (e: any) {
      setSaveError(e.message ?? "שגיאה בשמירה");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-brand-surface rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-brand-border sticky top-0 bg-brand-surface z-10">
          <h2 className="text-lg font-bold text-brand-text">
            {isEdit ? "עריכת מתכון" : "מתכון חדש"}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-brand-bg text-brand-muted hover:text-brand-text transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-5">
          {/* Mode tabs (only for new recipe) */}
          {!isEdit && (
            <div className="flex bg-brand-bg border border-brand-border rounded-xl p-1 gap-1">
              {([
                { key: "manual", label: "ידני", icon: <PenLine size={14} /> },
                { key: "url", label: "קישור", icon: <Link size={14} /> },
                { key: "image", label: "תמונה", icon: <ImageIcon size={14} /> },
                { key: "text", label: "טקסט", icon: <ClipboardPaste size={14} /> },
              ] as { key: Mode; label: string; icon: React.ReactNode }[]).map(({ key, label, icon }) => (
                <button
                  key={key}
                  onClick={() => { setMode(key); setShowFields(key === "manual"); setParseError(""); }}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-sm font-semibold transition-all ${
                    mode === key
                      ? "bg-brand-accent text-white shadow-sm"
                      : "text-brand-muted hover:text-brand-accent hover:bg-brand-card"
                  }`}
                >
                  {icon} {label}
                </button>
              ))}
            </div>
          )}

          {/* URL input */}
          {mode === "url" && !showFields && (
            <div className="flex flex-col gap-3">
              <input
                type="url"
                placeholder="https://..."
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleParseUrl(); }}
                className="w-full border border-brand-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-accent bg-brand-bg"
              />
              {parseError && <p className="text-red-500 text-xs">{parseError}</p>}
              <button
                onClick={handleParseUrl}
                disabled={parsing || !urlInput.trim()}
                className="flex items-center justify-center gap-2 bg-brand-accent text-white rounded-xl py-2.5 font-semibold text-sm disabled:opacity-50 transition-opacity"
              >
                {parsing ? <><Loader2 size={15} className="animate-spin" /> מפרסר...</> : "פרסר מתכון"}
              </button>
            </div>
          )}

          {/* Image upload */}
          {mode === "image" && !showFields && (
            <div className="flex flex-col gap-3">
              <label
                className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-brand-border rounded-xl p-8 cursor-pointer hover:border-brand-accent transition-colors bg-brand-bg"
                onClick={() => fileRef.current?.click()}
              >
                <ImageIcon size={28} className="text-brand-muted" />
                <span className="text-sm text-brand-muted">
                  {imageFile ? imageFile.name : "לחצי לבחירת תמונה"}
                </span>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
                />
              </label>
              {parseError && <p className="text-red-500 text-xs">{parseError}</p>}
              <button
                onClick={handleParseImage}
                disabled={parsing || !imageFile}
                className="flex items-center justify-center gap-2 bg-brand-accent text-white rounded-xl py-2.5 font-semibold text-sm disabled:opacity-50 transition-opacity"
              >
                {parsing ? <><Loader2 size={15} className="animate-spin" /> מפרסר...</> : "פרסר מתכון"}
              </button>
            </div>
          )}

          {/* Text paste */}
          {mode === "text" && !showFields && (
            <div className="flex flex-col gap-3">
              <p className="text-xs text-brand-muted">
                העתיקי את תוכן הדף (Ctrl+A → Ctrl+C) והדביקי כאן — שימושי כשהאתר חסום לפירסור אוטומטי.
              </p>
              <textarea
                rows={10}
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder="הדבקי כאן את טקסט המתכון..."
                className={`w-full border border-brand-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-brand-accent bg-brand-bg resize-y font-mono`}
              />
              {parseError && <p className="text-red-500 text-xs">{parseError}</p>}
              <button
                onClick={handleParseText}
                disabled={parsing || !pasteText.trim()}
                className="flex items-center justify-center gap-2 bg-brand-accent text-white rounded-xl py-2.5 font-semibold text-sm disabled:opacity-50 transition-opacity"
              >
                {parsing ? <><Loader2 size={15} className="animate-spin" /> מפרסר...</> : "פרסר מתכון"}
              </button>
            </div>
          )}

          {/* Form fields (manual always, url/image/text after parse) */}
          {showFields && (
            <>
              {(mode === "url" || mode === "image") && (
                <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-2.5 text-sm text-green-700">
                  <span>✓</span>
                  <span className="font-semibold">המתכון פורסר — בדקי ואשרי</span>
                  <button
                    onClick={() => setShowFields(false)}
                    className="mr-auto text-green-600 hover:text-green-800 text-xs underline"
                  >
                    חזרה
                  </button>
                </div>
              )}

              <Field label="שם המתכון *">
                <input
                  value={form.name}
                  onChange={(e) => setField("name", e.target.value)}
                  placeholder="שם המתכון"
                  className={inputCls}
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="זמן הכנה (דק׳)">
                  <input
                    type="number" min={0}
                    value={form.prep_time_minutes}
                    onChange={(e) => setField("prep_time_minutes", e.target.value)}
                    className={inputCls}
                  />
                </Field>
                <Field label="מנות">
                  <input
                    type="number" min={0}
                    value={form.servings}
                    onChange={(e) => setField("servings", e.target.value)}
                    className={inputCls}
                  />
                </Field>
              </div>

              <Field label="מצרכים *">
                <textarea
                  rows={5}
                  value={form.ingredients}
                  onChange={(e) => setField("ingredients", e.target.value)}
                  placeholder="מצרך אחד בכל שורה..."
                  className={inputCls + " resize-y"}
                />
              </Field>

              <Field label="הוראות הכנה *">
                <textarea
                  rows={6}
                  value={form.instructions}
                  onChange={(e) => setField("instructions", e.target.value)}
                  placeholder="הוראות שלב אחר שלב..."
                  className={inputCls + " resize-y"}
                />
              </Field>

              <Field label="וריאציות / טיפים">
                <textarea
                  rows={3}
                  value={form.variations}
                  onChange={(e) => setField("variations", e.target.value)}
                  className={inputCls + " resize-y"}
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="מקור">
                  <input
                    value={form.source_url}
                    onChange={(e) => setField("source_url", e.target.value)}
                    placeholder="https://... או טקסט חופשי"
                    className={inputCls}
                  />
                </Field>
                <Field label="קישור תמונה">
                  <input
                    value={form.image_url}
                    onChange={(e) => setField("image_url", e.target.value)}
                    placeholder="https://..."
                    className={inputCls}
                  />
                </Field>
              </div>

              {/* Labels */}
              <Field label="תוויות">
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {labels.map((l) => (
                    <button
                      key={l.id}
                      onClick={() => toggleLabel(l.id)}
                      type="button"
                      className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-all ${
                        form.label_ids.includes(l.id)
                          ? "bg-brand-accent border-brand-accent text-white"
                          : "border-brand-border text-brand-muted hover:border-brand-accent hover:text-brand-accent bg-brand-bg"
                      }`}
                    >
                      {l.name}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    value={newLabelInput}
                    onChange={(e) => setNewLabelInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddLabel(); } }}
                    placeholder="תווית חדשה..."
                    className={`${inputCls} flex-1 py-1.5 text-xs`}
                  />
                  <button
                    onClick={handleAddLabel}
                    disabled={addingLabel || !newLabelInput.trim()}
                    className="flex items-center gap-1 px-3 py-1.5 bg-brand-card border border-brand-border rounded-lg text-xs font-semibold text-brand-accent hover:bg-brand-accent hover:text-white disabled:opacity-40 transition-all"
                  >
                    {addingLabel ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                    הוסף
                  </button>
                </div>
              </Field>
            </>
          )}
        </div>

        {/* Footer */}
        {showFields && (
          <div className="flex items-center justify-between gap-3 p-5 border-t border-brand-border sticky bottom-0 bg-brand-surface">
            {saveError
              ? <p className="text-red-500 text-xs flex-1">{saveError}</p>
              : <span />
            }
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-brand-border text-brand-muted text-sm font-semibold hover:bg-brand-bg transition-colors"
              >
                ביטול
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2 bg-brand-accent text-white rounded-xl text-sm font-bold disabled:opacity-50 hover:opacity-90 transition-opacity"
              >
                {saving ? <><Loader2 size={14} className="animate-spin" /> שומר...</> : "שמור מתכון"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const inputCls = "w-full border border-brand-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-accent bg-brand-bg text-brand-text placeholder:text-brand-muted transition-colors";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-brand-muted uppercase tracking-wide">{label}</label>
      {children}
    </div>
  );
}

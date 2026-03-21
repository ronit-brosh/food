"use client";
import { useEffect, useState, useCallback } from "react";
import { Recipe, RecipeListItem, Label, SortOption } from "@/lib/types";
import { fetchRecipes, fetchRecipe, fetchLabels, deleteRecipe, deleteLabel } from "@/lib/api";
import Sidebar from "@/components/Sidebar";
import RecipeDetail from "@/components/RecipeDetail";
import RecipeFormModal from "@/components/admin/RecipeFormModal";
import { Plus } from "lucide-react";

const IS_ADMIN = process.env.NEXT_PUBLIC_ADMIN_MODE === "true";

export default function Home() {
  const isLocal = typeof window !== "undefined" && window.location.hostname === "localhost";
  const [recipes, setRecipes] = useState<RecipeListItem[]>([]);
  const [labels, setLabels] = useState<Label[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeRecipe, setActiveRecipe] = useState<Recipe | null>(null);
  const [sort, setSort] = useState<SortOption>("name");
  const [activeLabelIds, setActiveLabelIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Admin modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | undefined>(undefined);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const loadRecipes = useCallback(async () => {
    try {
      const data = await fetchRecipes(sort, activeLabelIds);
      setRecipes(data);
    } catch {
      setError("שגיאה בטעינת מתכונים");
    }
  }, [sort, activeLabelIds]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const [r, l] = await Promise.all([fetchRecipes(), fetchLabels()]);
        setRecipes(r);
        setLabels(l);
      } catch {
        setError("לא ניתן להתחבר לשרת");
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (!loading) loadRecipes();
  }, [sort, activeLabelIds]);

  const handleSelectRecipe = async (id: string) => {
    setActiveId(id);
    setDetailLoading(true);
    try {
      const r = await fetchRecipe(id);
      setActiveRecipe(r);
    } catch {
      setError("שגיאה בטעינת מתכון");
    } finally {
      setDetailLoading(false);
    }
  };

  const handleToggleLabel = (id: number) => {
    setActiveLabelIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleRecipeUpdate = (updated: Recipe) => {
    setActiveRecipe(updated);
    setRecipes((prev) =>
      prev.map((r) =>
        r.id === updated.id
          ? { ...r, rating: updated.rating ?? undefined, rating_count: updated.rating_count }
          : r
      )
    );
  };

  const handleModalSave = async (saved: Recipe) => {
    setModalOpen(false);
    setEditingRecipe(undefined);
    await loadRecipes();
    setActiveId(saved.id);
    setActiveRecipe(saved);
  };

  const handleDelete = async () => {
    if (!activeRecipe) return;
    await deleteRecipe(activeRecipe.id);
    setActiveId(null);
    setActiveRecipe(null);
    setDeleteConfirm(false);
    await loadRecipes();
  };

  const handleDeleteLabel = async (id: number) => {
    await deleteLabel(id);
    setLabels((prev) => prev.filter((l) => l.id !== id));
    setActiveLabelIds((prev) => prev.filter((x) => x !== id));
  };

  const openAddModal = () => {
    setEditingRecipe(undefined);
    setModalOpen(true);
  };

  const openEditModal = () => {
    if (!activeRecipe) return;
    setEditingRecipe(activeRecipe);
    setModalOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-brand-bg">
        <div className="text-brand-muted animate-pulse flex flex-col items-center gap-3">
          <span className="text-5xl">🧑‍🍳</span>
          <span className="font-semibold">טוען מתכונים...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-brand-bg">
        <div className="text-center bg-brand-surface border border-brand-border rounded-2xl p-8 shadow-sm">
          <div className="text-4xl mb-3">⚠️</div>
          <div className="text-brand-text font-semibold mb-1">{error}</div>
          <div className="text-brand-muted text-sm">ודאי שה-backend רץ בפורט 8000</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-brand-bg">
      <Sidebar
        recipes={recipes}
        labels={labels}
        activeId={activeId}
        sort={sort}
        activeLabelIds={activeLabelIds}
        isAdmin={IS_ADMIN}
        onSelectRecipe={handleSelectRecipe}
        onSortChange={setSort}
        onToggleLabel={handleToggleLabel}
        onClearFilters={() => setActiveLabelIds([])}
        onDeleteLabel={IS_ADMIN && isLocal ? handleDeleteLabel : undefined}
      />

      <main className="flex-1 overflow-hidden p-6 relative">
        {detailLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-pulse text-brand-muted font-semibold">טוען...</div>
          </div>
        ) : activeRecipe ? (
          <RecipeDetail
            recipe={activeRecipe}
            onUpdate={handleRecipeUpdate}
            isAdmin={IS_ADMIN}
            onEdit={openEditModal}
            onDelete={() => setDeleteConfirm(true)}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="text-6xl mb-4">🍽️</div>
            <h2 className="text-xl font-bold text-brand-text mb-2">בחרי מתכון מהרשימה</h2>
            <p className="text-brand-muted text-sm">{recipes.length} מתכונים מחכים לך</p>
          </div>
        )}

        {/* Admin FAB */}
        {IS_ADMIN && (
          <button
            onClick={openAddModal}
            className="fixed bottom-6 left-6 w-12 h-12 bg-brand-accent text-white rounded-full shadow-lg flex items-center justify-center hover:opacity-90 transition-all hover:-translate-y-0.5 z-40"
            title="הוסף מתכון"
          >
            <Plus size={22} />
          </button>
        )}
      </main>

      {/* Add/Edit modal */}
      {IS_ADMIN && modalOpen && (
        <RecipeFormModal
          recipe={editingRecipe}
          labels={labels}
          onSave={handleModalSave}
          onClose={() => { setModalOpen(false); setEditingRecipe(undefined); }}
          onLabelsChange={setLabels}
        />
      )}

      {/* Delete confirm */}
      {IS_ADMIN && deleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }}
        >
          <div className="bg-brand-surface rounded-2xl shadow-2xl p-6 max-w-sm w-full text-center">
            <div className="text-3xl mb-3">🗑️</div>
            <h3 className="text-lg font-bold text-brand-text mb-1">מחיקת מתכון</h3>
            <p className="text-brand-muted text-sm mb-5">
              למחוק את <strong>{activeRecipe?.name}</strong>? לא ניתן לבטל.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setDeleteConfirm(false)}
                className="px-5 py-2 rounded-xl border border-brand-border text-brand-muted text-sm font-semibold hover:bg-brand-bg transition-colors"
              >
                ביטול
              </button>
              <button
                onClick={handleDelete}
                className="px-5 py-2 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 transition-colors"
              >
                מחק
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { Recipe, RecipeListItem, Label, SortOption, ParsedRecipe } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    try {
      const body = await res.json();
      throw new Error(body.detail || `HTTP ${res.status}`);
    } catch (e) {
      if (e instanceof Error && e.message !== `HTTP ${res.status}`) throw e;
      throw new Error(`HTTP ${res.status}`);
    }
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

// Recipes
export async function fetchRecipes(
  sort: SortOption = "name",
  labelIds: number[] = []
): Promise<RecipeListItem[]> {
  const params = new URLSearchParams({ sort });
  labelIds.forEach((id) => params.append("label_ids", String(id)));
  return apiFetch<RecipeListItem[]>(`/api/recipes?${params}`);
}

export async function fetchRecipe(id: string): Promise<Recipe> {
  return apiFetch<Recipe>(`/api/recipes/${id}`);
}

export async function createRecipe(data: Omit<Recipe, "id" | "rating" | "rating_count" | "created_at" | "updated_at"> & { label_ids: number[] }, autoSync = true): Promise<Recipe> {
  return apiFetch<Recipe>(`/api/recipes?auto_sync=${autoSync}`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateRecipe(id: string, data: Omit<Recipe, "id" | "rating" | "rating_count" | "created_at" | "updated_at"> & { label_ids: number[] }, autoSync = true): Promise<Recipe> {
  return apiFetch<Recipe>(`/api/recipes/${id}?auto_sync=${autoSync}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteRecipe(id: string, autoSync = true): Promise<void> {
  return apiFetch<void>(`/api/recipes/${id}?auto_sync=${autoSync}`, { method: "DELETE" });
}

export async function rateRecipe(id: string, rating: number, previousRating?: number): Promise<Recipe> {
  return apiFetch<Recipe>(`/api/recipes/${id}/rate`, {
    method: "POST",
    body: JSON.stringify({ rating, previous_rating: previousRating ?? null }),
  });
}

// Labels
export async function fetchLabels(): Promise<Label[]> {
  return apiFetch<Label[]>("/api/labels");
}

export async function createLabel(name: string): Promise<Label> {
  return apiFetch<Label>("/api/labels", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export async function deleteLabel(id: number): Promise<void> {
  return apiFetch<void>(`/api/labels/${id}`, { method: "DELETE" });
}

export interface DiffItem { id: string; name: string; }
export interface DiffResult {
  to_add: DiffItem[];
  to_update: DiffItem[];
  to_delete: DiffItem[];
}

export async function listS3Images(): Promise<{ key: string; url: string; name: string }[]> {
  return apiFetch("/api/admin/list-images");
}

export async function uploadImageToS3(file: File): Promise<string> {
  const { upload_url, image_url } = await apiFetch<{ upload_url: string; image_url: string }>(
    `/api/admin/upload-image-url?filename=${encodeURIComponent(file.name)}&content_type=${encodeURIComponent(file.type)}`
  );
  await fetch(upload_url, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
  return image_url;
}

export async function getDiff(): Promise<DiffResult> {
  return apiFetch<DiffResult>("/api/admin/diff");
}

export async function syncSelected(add: string[], update: string[], del: string[]): Promise<void> {
  return apiFetch<void>("/api/admin/sync-selected", {
    method: "POST",
    body: JSON.stringify({ add, update, delete: del }),
  });
}

// Admin (local only)
export async function parseRecipeFromUrl(url: string): Promise<ParsedRecipe> {
  return apiFetch<ParsedRecipe>("/api/admin/parse", {
    method: "POST",
    body: JSON.stringify({ url }),
  });
}

export async function parseRecipeFromImage(imageBase64: string, mediaType: string): Promise<ParsedRecipe> {
  return apiFetch<ParsedRecipe>("/api/admin/parse", {
    method: "POST",
    body: JSON.stringify({ image_base64: imageBase64, media_type: mediaType }),
  });
}

export async function parseRecipeFromText(text: string): Promise<ParsedRecipe> {
  return apiFetch<ParsedRecipe>("/api/admin/parse", {
    method: "POST",
    body: JSON.stringify({ text }),
  });
}

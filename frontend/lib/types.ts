export interface Label {
  id: number;
  name: string;
}

export interface RecipeListItem {
  id: string;
  name: string;
  prep_time_minutes?: number;
  servings?: number;
  image_url?: string;
  rating?: number;
  rating_count: number;
  labels: Label[];
  created_at: string;
  updated_at: string;
}

export interface Recipe extends RecipeListItem {
  ingredients: string;
  instructions: string;
  variations?: string;
  source_url?: string;
}

export type SortOption = "name" | "created_at";

export interface ParsedRecipe {
  name: string;
  prep_time_minutes?: number | null;
  servings?: number | null;
  ingredients: string;
  instructions: string;
  variations?: string | null;
  source_url?: string | null;
  image_url?: string | null;
  suggested_labels?: string[];
}

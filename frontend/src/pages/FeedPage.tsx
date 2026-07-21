import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { RecipeCard } from '../components/RecipeCard';
import { FeedItem } from '../api/types';

export function FeedPage() {
  const [recipes, setRecipes] = useState<FeedItem[] | null>(null);

  useEffect(() => {
    api.get<FeedItem[]>('/recipes?limit=30').then(setRecipes);
  }, []);

  if (recipes === null) return <p>Chargement du fil de recettes...</p>;

  if (recipes.length === 0) {
    return (
      <div className="empty-state">
        <p>Aucune recette publiée pour le moment.</p>
      </div>
    );
  }

  return (
    <div>
      <h1>Fil de recettes</h1>
      {recipes.map((r) => (
        <RecipeCard key={r.id} recipe={r} />
      ))}
    </div>
  );
}

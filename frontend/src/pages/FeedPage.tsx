import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { RecipeCard } from '../components/RecipeCard';
import { FeedItem } from '../api/types';

export function FeedPage() {
  const [recipes, setRecipes] = useState<FeedItem[] | null>(null);
  const [search, setSearch] = useState('');
  const [minCalories, setMinCalories] = useState('');
  const [maxCalories, setMaxCalories] = useState('');
  const [minProtein, setMinProtein] = useState('');

  useEffect(() => {
    const params = new URLSearchParams({ limit: '30' });
    if (search.trim()) params.set('search', search.trim());
    if (minCalories) params.set('minCalories', minCalories);
    if (maxCalories) params.set('maxCalories', maxCalories);
    if (minProtein) params.set('minProtein', minProtein);

    const timeout = setTimeout(() => {
      api.get<FeedItem[]>(`/recipes?${params.toString()}`).then(setRecipes);
    }, 250);
    return () => clearTimeout(timeout);
  }, [search, minCalories, maxCalories, minProtein]);

  const hasActiveFilters = minCalories || maxCalories || minProtein;
  const resetFilters = () => {
    setMinCalories('');
    setMaxCalories('');
    setMinProtein('');
  };

  return (
    <div>
      <h1>Fil de recettes</h1>

      <div className="card feed-filters">
        <input
          type="search"
          placeholder="Rechercher une recette par nom..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Rechercher une recette"
        />
        <div className="feed-filters__macros">
          <div className="field">
            <label htmlFor="minCalories">Kcal min.</label>
            <input
              id="minCalories"
              type="number"
              min={0}
              value={minCalories}
              onChange={(e) => setMinCalories(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="maxCalories">Kcal max.</label>
            <input
              id="maxCalories"
              type="number"
              min={0}
              value={maxCalories}
              onChange={(e) => setMaxCalories(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="minProtein">Protéines min. (g)</label>
            <input
              id="minProtein"
              type="number"
              min={0}
              value={minProtein}
              onChange={(e) => setMinProtein(e.target.value)}
            />
          </div>
          {hasActiveFilters && (
            <button type="button" className="btn btn--ghost" onClick={resetFilters}>
              Réinitialiser
            </button>
          )}
        </div>
      </div>

      {recipes === null ? (
        <p>Chargement du fil de recettes...</p>
      ) : recipes.length === 0 ? (
        <div className="empty-state">
          <p>Aucune recette ne correspond à ces critères.</p>
        </div>
      ) : (
        recipes.map((r) => <RecipeCard key={r.id} recipe={r} />)
      )}
    </div>
  );
}

import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { FeedItem } from '../api/types';

export function RecipeSearch({ onPick, placeholder }: { onPick: (recipe: FeedItem) => void; placeholder?: string }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    const handle = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await api.get<FeedItem[]>(`/recipes?search=${encodeURIComponent(query.trim())}&limit=10`);
        setResults(data);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(handle);
  }, [query]);

  return (
    <div className="field">
      <input
        type="text"
        placeholder={placeholder ?? 'Rechercher une recette par nom...'}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {query.trim().length >= 2 && (
        <div className="search-results">
          {loading && <p style={{ padding: '8px 10px', margin: 0 }}>Recherche...</p>}
          {!loading && results.length === 0 && <p style={{ padding: '8px 10px', margin: 0 }}>Aucun résultat.</p>}
          {!loading &&
            results.map((recipe) => (
              <button
                key={recipe.id}
                type="button"
                onClick={() => {
                  onPick(recipe);
                  setQuery('');
                  setResults([]);
                }}
              >
                {recipe.title} — {recipe.macros.calories} kcal · {recipe.macros.protein} g protéines au total (
                {recipe.servings} portion{recipe.servings > 1 ? 's' : ''})
              </button>
            ))}
        </div>
      )}
    </div>
  );
}

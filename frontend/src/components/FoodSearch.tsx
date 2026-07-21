import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { FoodSearchResult } from '../api/types';

const STATE_LABELS: Record<string, string> = {
  cru: '🥩 cru',
  cuit: '🍳 cuit',
  generique: 'générique',
  produit_de_marque: 'marque',
};

export function FoodSearch({ onPick, placeholder }: { onPick: (food: FoodSearchResult) => void; placeholder?: string }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FoodSearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    const handle = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await api.get<FoodSearchResult[]>(`/foods?search=${encodeURIComponent(query.trim())}`);
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
        placeholder={placeholder ?? 'Rechercher un aliment (ex. poulet, riz, courgette...)'}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {query.trim().length >= 2 && (
        <div className="search-results">
          {loading && <p style={{ padding: '8px 10px', margin: 0 }}>Recherche...</p>}
          {!loading && results.length === 0 && <p style={{ padding: '8px 10px', margin: 0 }}>Aucun résultat.</p>}
          {!loading &&
            results.map((food) => (
              <button
                key={food.id}
                type="button"
                onClick={() => {
                  onPick(food);
                  setQuery('');
                  setResults([]);
                }}
              >
                {food.name} {food.brand ? `(${food.brand})` : ''}
                {' — '}
                {STATE_LABELS[food.state] ?? food.state} · {food.calories_kcal_per_100g} kcal/100g
              </button>
            ))}
        </div>
      )}
    </div>
  );
}

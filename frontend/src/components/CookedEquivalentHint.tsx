import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { FoodSearchResult } from '../api/types';

// Affiché sous un ingrédient cru : propose de basculer sur un aliment cuit
// proche (trouvé par similarité de nom côté serveur, cf. brief). Le grammage
// n'est PAS recalculé automatiquement lors du remplacement : cuire un
// aliment lui fait perdre du poids (eau), donc appliquer les valeurs "cuit"
// à la quantité "crue" saisie fausserait le calcul. On se contente de
// permettre à l'utilisateur de choisir le bon aliment ; à lui d'ajuster le
// grammage à la quantité réellement cuite pesée.
export function CookedEquivalentHint({
  foodId,
  foodState,
  onSwap,
}: {
  foodId: string;
  foodState: string;
  onSwap: (food: FoodSearchResult) => void;
}) {
  const [suggestions, setSuggestions] = useState<FoodSearchResult[]>([]);

  useEffect(() => {
    setSuggestions([]);
    if (foodState !== 'cru') return;
    api.get<FoodSearchResult[]>(`/foods/${foodId}/cooked-equivalents`).then(setSuggestions);
  }, [foodId, foodState]);

  if (suggestions.length === 0) return null;
  const best = suggestions[0];

  return (
    <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: '-4px 0 8px', flexBasis: '100%' }}>
      🥩 Cru — équivalent cuit trouvé :{' '}
      <button
        type="button"
        onClick={() => onSwap(best)}
        style={{ background: 'none', border: 'none', padding: 0, color: 'var(--color-primary)', textDecoration: 'underline', cursor: 'pointer', font: 'inherit' }}
      >
        {best.name} ({best.calories_kcal_per_100g} kcal, {best.protein_g_per_100g} g protéines /100g)
      </button>
      {' — pensez à ajuster le grammage au poids réellement cuit, la cuisson fait perdre de l\'eau.'}
    </p>
  );
}

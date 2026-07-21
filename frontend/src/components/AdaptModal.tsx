import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ApiError } from '../api/client';
import { FoodSearchResult, MacroSet, RecipeDetail } from '../api/types';
import { computeTotals, perServing } from '../lib/macros';
import { CookedEquivalentHint } from './CookedEquivalentHint';
import { FoodSearch } from './FoodSearch';
import { MacroGrid } from './MacroGrid';

interface AdaptIngredient {
  foodId: string;
  name: string;
  state: string;
  grams: number;
  per100g: MacroSet;
  replacedFoodId: string | null;
}

function toPer100g(food: FoodSearchResult): MacroSet {
  return {
    calories: food.calories_kcal_per_100g,
    protein: food.protein_g_per_100g,
    carbs: food.carbs_g_per_100g,
    fat: food.fat_g_per_100g,
    fiber: null,
    sugar: null,
    saturatedFat: null,
    salt: null,
  };
}

function diffLabel(delta: number, unit: string) {
  const rounded = Math.round(delta * 10) / 10;
  if (rounded === 0) return <span>{unit === 'kcal' ? '0 kcal' : `0 g`}</span>;
  const cls = rounded > 0 ? 'diff diff--up' : 'diff diff--down';
  const sign = rounded > 0 ? '+' : '';
  return (
    <span className={cls}>
      {sign}
      {rounded} {unit}
    </span>
  );
}

export function AdaptModal({ recipe, onClose }: { recipe: RecipeDetail; onClose: () => void }) {
  const navigate = useNavigate();
  const [ingredients, setIngredients] = useState<AdaptIngredient[]>(
    recipe.ingredients.map((i) => ({
      foodId: i.foodId,
      name: i.name,
      state: i.state,
      grams: i.grams,
      per100g: i.per100g,
      replacedFoodId: null,
    })),
  );
  const [servings, setServings] = useState(recipe.servings);
  const [visibility, setVisibility] = useState<'privee' | 'publique'>('privee');
  const [replacingIndex, setReplacingIndex] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totals = useMemo(() => computeTotals(ingredients), [ingredients]);
  const totalsPerServing = useMemo(() => perServing(totals, servings), [totals, servings]);

  const updateGrams = (index: number, grams: number) => {
    setIngredients((prev) => prev.map((ing, i) => (i === index ? { ...ing, grams } : ing)));
  };

  const removeIngredient = (index: number) => {
    setIngredients((prev) => prev.filter((_, i) => i !== index));
  };

  const replaceIngredient = (index: number, food: FoodSearchResult) => {
    setIngredients((prev) =>
      prev.map((ing, i) =>
        i === index
          ? {
              foodId: food.id,
              name: food.name,
              state: food.state,
              grams: ing.grams,
              replacedFoodId: ing.replacedFoodId ?? ing.foodId,
              per100g: toPer100g(food),
            }
          : ing,
      ),
    );
    setReplacingIndex(null);
  };

  const addIngredient = (food: FoodSearchResult) => {
    setIngredients((prev) => [
      ...prev,
      { foodId: food.id, name: food.name, state: food.state, grams: 100, replacedFoodId: null, per100g: toPer100g(food) },
    ]);
  };

  const save = async () => {
    setError(null);
    setSaving(true);
    try {
      const result = await api.post<RecipeDetail>(`/recipes/${recipe.id}/adapt`, {
        servings,
        visibility,
        ingredients: ingredients.map((i) => ({
          foodId: i.foodId,
          quantity: i.grams,
          unit: 'gramme',
          replacedFoodId: i.replacedFoodId ?? undefined,
        })),
      });
      onClose();
      navigate(`/recipes/${result.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Une erreur est survenue.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Adapter la recette</h2>
        {error && <div className="error-banner">{error}</div>}

        <div className="field">
          <label htmlFor="servings">Nombre de portions</label>
          <input
            id="servings"
            type="number"
            min={1}
            value={servings}
            onChange={(e) => setServings(Math.max(1, Number(e.target.value)))}
          />
        </div>

        <div>
          {ingredients.map((ing, index) => (
            <div key={index}>
              <div className="ingredient-row">
                <span className="ingredient-row__name">{ing.name}</span>
                <input
                  type="number"
                  min={0}
                  value={ing.grams}
                  onChange={(e) => updateGrams(index, Number(e.target.value))}
                />
                <span>g</span>
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={() => setReplacingIndex(replacingIndex === index ? null : index)}
                >
                  Remplacer
                </button>
                <button type="button" className="btn btn--ghost" onClick={() => removeIngredient(index)}>
                  ✕
                </button>
              </div>
              {replacingIndex === index && (
                <FoodSearch placeholder="Remplacer par..." onPick={(food) => replaceIngredient(index, food)} />
              )}
              <CookedEquivalentHint foodId={ing.foodId} foodState={ing.state} onSwap={(food) => replaceIngredient(index, food)} />
            </div>
          ))}
        </div>

        <div style={{ marginTop: 8 }}>
          <FoodSearch placeholder="Ajouter un ingrédient..." onPick={addIngredient} />
        </div>

        <MacroGrid title="Total de la recette adaptée" macros={totals} />
        <MacroGrid title={`Par portion (${servings})`} macros={totalsPerServing} />

        <div className="card" style={{ background: 'var(--color-bg)' }}>
          <p style={{ margin: '0 0 6px', fontWeight: 600 }}>Écart vs. recette originale (total)</p>
          <div className="macro-row">
            <span>Calories : {diffLabel(totals.calories - recipe.macros.total.calories, 'kcal')}</span>
            <span>Protéines : {diffLabel(totals.protein - recipe.macros.total.protein, 'g')}</span>
            <span>Glucides : {diffLabel(totals.carbs - recipe.macros.total.carbs, 'g')}</span>
            <span>Lipides : {diffLabel(totals.fat - recipe.macros.total.fat, 'g')}</span>
          </div>
        </div>

        <div className="field">
          <label htmlFor="visibility">Visibilité de l'adaptation</label>
          <select id="visibility" value={visibility} onChange={(e) => setVisibility(e.target.value as 'privee' | 'publique')}>
            <option value="privee">Privée (juste pour moi)</option>
            <option value="publique">Publique (partagée sur le fil)</option>
          </select>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
          <button className="btn" onClick={save} disabled={saving || ingredients.length === 0}>
            {saving ? 'Enregistrement...' : 'Enregistrer cette adaptation'}
          </button>
          <button className="btn btn--ghost" onClick={onClose} disabled={saving}>
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
}

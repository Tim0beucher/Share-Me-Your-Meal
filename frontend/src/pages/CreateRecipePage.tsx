import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ApiError } from '../api/client';
import { FoodSearchResult, MacroSet, RecipeDetail } from '../api/types';
import { CookedEquivalentHint } from '../components/CookedEquivalentHint';
import { FoodSearch } from '../components/FoodSearch';
import { MacroGrid } from '../components/MacroGrid';
import { computeTotals, perServing } from '../lib/macros';

interface DraftIngredient {
  foodId: string;
  name: string;
  state: string;
  grams: number;
  per100g: MacroSet;
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

export function CreateRecipePage() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [servings, setServings] = useState(2);
  const [ingredients, setIngredients] = useState<DraftIngredient[]>([]);
  const [steps, setSteps] = useState<string[]>(['']);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totals = useMemo(() => computeTotals(ingredients), [ingredients]);
  const totalsPerServing = useMemo(() => perServing(totals, servings), [totals, servings]);

  const addIngredient = (food: FoodSearchResult) => {
    setIngredients((prev) => [
      ...prev,
      { foodId: food.id, name: food.name, state: food.state, grams: 100, per100g: toPer100g(food) },
    ]);
  };

  const updateGrams = (index: number, grams: number) => {
    setIngredients((prev) => prev.map((ing, i) => (i === index ? { ...ing, grams } : ing)));
  };

  const swapIngredient = (index: number, food: FoodSearchResult) => {
    setIngredients((prev) =>
      prev.map((ing, i) =>
        i === index ? { ...ing, foodId: food.id, name: food.name, state: food.state, per100g: toPer100g(food) } : ing,
      ),
    );
  };

  const removeIngredient = (index: number) => setIngredients((prev) => prev.filter((_, i) => i !== index));

  const updateStep = (index: number, value: string) => {
    setSteps((prev) => prev.map((s, i) => (i === index ? value : s)));
  };

  const removeStep = (index: number) => setSteps((prev) => prev.filter((_, i) => i !== index));

  const submit = async (publish: boolean) => {
    setError(null);
    if (!title.trim()) {
      setError('Le titre est obligatoire.');
      return;
    }
    if (ingredients.length === 0) {
      setError('Ajoutez au moins un ingrédient.');
      return;
    }
    setSaving(true);
    try {
      const result = await api.post<RecipeDetail>('/recipes', {
        title,
        description: description || undefined,
        servings,
        publish,
        ingredients: ingredients.map((i) => ({ foodId: i.foodId, quantity: i.grams, unit: 'gramme' })),
        steps: steps
          .map((instruction, i) => ({ stepNumber: i + 1, instruction: instruction.trim() }))
          .filter((s) => s.instruction.length > 0),
      });
      navigate(`/recipes/${result.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Une erreur est survenue.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h1>Créer une recette</h1>
      {error && <div className="error-banner">{error}</div>}

      <div className="card">
        <div className="field">
          <label htmlFor="title">Nom de la recette</label>
          <input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="description">Description</label>
          <textarea id="description" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
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
      </div>

      <div className="card">
        <h2>Ingrédients</h2>
        {ingredients.map((ing, index) => (
          <div key={index} className="ingredient-block">
            <div className="ingredient-row">
              <span className="ingredient-row__name">{ing.name}</span>
              <input type="number" min={0} value={ing.grams} onChange={(e) => updateGrams(index, Number(e.target.value))} />
              <span>g</span>
              <button type="button" className="btn btn--ghost" onClick={() => removeIngredient(index)}>
                ✕
              </button>
            </div>
            <CookedEquivalentHint foodId={ing.foodId} foodState={ing.state} onSwap={(food) => swapIngredient(index, food)} />
          </div>
        ))}
        <FoodSearch onPick={addIngredient} />
      </div>

      <div className="card">
        <h2>Macros de la recette (aperçu en direct)</h2>
        <MacroGrid title="Total" macros={totals} />
        <MacroGrid title={`Par portion (${servings})`} macros={totalsPerServing} />
      </div>

      <div className="card">
        <h2>Étapes de préparation</h2>
        {steps.map((step, index) => (
          <div key={index} className="ingredient-row">
            <span>{index + 1}.</span>
            <input
              style={{ flex: 1 }}
              value={step}
              onChange={(e) => updateStep(index, e.target.value)}
              placeholder={`Étape ${index + 1}`}
            />
            <button type="button" className="btn btn--ghost" onClick={() => removeStep(index)}>
              ✕
            </button>
          </div>
        ))}
        <button type="button" className="btn btn--ghost" onClick={() => setSteps((prev) => [...prev, ''])}>
          + Ajouter une étape
        </button>
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button className="btn" onClick={() => submit(true)} disabled={saving}>
          {saving ? 'Publication...' : 'Publier la recette'}
        </button>
        <button className="btn btn--ghost" onClick={() => submit(false)} disabled={saving}>
          Enregistrer en brouillon
        </button>
      </div>
    </div>
  );
}

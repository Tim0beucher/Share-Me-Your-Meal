import { ChangeEvent, useMemo, useState } from 'react';
import { api, ApiError } from '../api/client';
import { FoodSearchResult, ParsedIngredient } from '../api/types';
import { DraftIngredient, toPer100g } from '../lib/recipeDraft';
import { compressImage } from '../lib/image';
import { computeTotals, perServing } from '../lib/macros';
import { CookedEquivalentHint } from './CookedEquivalentHint';
import { FoodSearch } from './FoodSearch';
import { MacroGrid } from './MacroGrid';

export interface RecipeFormPayload {
  title: string;
  description?: string;
  servings: number;
  coverPhotoUrl?: string;
  ingredients: { foodId: string; quantity: number; unit: 'gramme' }[];
  steps: { stepNumber: number; instruction: string }[];
}

export interface RecipeFormAction {
  label: string;
  savingLabel: string;
  publish: boolean;
  variant?: 'primary' | 'ghost';
}

interface RecipeFormProps {
  heading: string;
  initialTitle?: string;
  initialDescription?: string;
  initialServings?: number;
  initialIngredients?: DraftIngredient[];
  initialSteps?: string[];
  initialCoverPhotoUrl?: string | null;
  actions: RecipeFormAction[];
  onSubmit: (payload: RecipeFormPayload, publish: boolean) => Promise<void>;
}

export function RecipeForm({
  heading,
  initialTitle = '',
  initialDescription = '',
  initialServings = 2,
  initialIngredients = [],
  initialSteps = [''],
  initialCoverPhotoUrl = null,
  actions,
  onSubmit,
}: RecipeFormProps) {
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);
  const [servings, setServings] = useState(initialServings);
  const [ingredients, setIngredients] = useState<DraftIngredient[]>(initialIngredients);
  const [steps, setSteps] = useState<string[]>(initialSteps);
  const [coverPhotoUrl, setCoverPhotoUrl] = useState<string | null>(initialCoverPhotoUrl);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [saving, setSaving] = useState<RecipeFormAction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ingredientText, setIngredientText] = useState('');
  const [parsing, setParsing] = useState(false);
  const [parseWarnings, setParseWarnings] = useState<string[]>([]);

  const onPickPhoto = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setPhotoError(null);
    try {
      setCoverPhotoUrl(await compressImage(file));
    } catch {
      setPhotoError("Impossible de traiter cette image, essayez-en une autre.");
    }
  };

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
        i === index
          ? { ...ing, foodId: food.id, name: food.name, state: food.state, per100g: toPer100g(food), alternatives: undefined }
          : ing,
      ),
    );
  };

  const removeIngredient = (index: number) => setIngredients((prev) => prev.filter((_, i) => i !== index));

  const parseIngredientText = async () => {
    if (!ingredientText.trim()) return;
    setParsing(true);
    setParseWarnings([]);
    try {
      const results = await api.post<ParsedIngredient[]>('/foods/parse-ingredients', { text: ingredientText });
      const added: DraftIngredient[] = [];
      const warnings: string[] = [];
      for (const result of results) {
        if (!result.matched) {
          warnings.push(result.raw);
          continue;
        }
        added.push({
          foodId: result.matched.id,
          name: result.matched.name,
          state: result.matched.state,
          grams: result.quantity,
          per100g: toPer100g(result.matched),
          alternatives: result.alternatives.length > 0 ? result.alternatives : undefined,
          quantityGuessed: result.quantityGuessed,
        });
      }
      setIngredients((prev) => [...prev, ...added]);
      setParseWarnings(warnings);
      setIngredientText('');
    } catch (err) {
      setParseWarnings([err instanceof ApiError ? err.message : 'Une erreur est survenue.']);
    } finally {
      setParsing(false);
    }
  };

  const updateStep = (index: number, value: string) => {
    setSteps((prev) => prev.map((s, i) => (i === index ? value : s)));
  };

  const removeStep = (index: number) => setSteps((prev) => prev.filter((_, i) => i !== index));

  const showError = (message: string) => {
    setError(message);
    // Le formulaire peut être long : sans ça, une erreur déclenchée en
    // cliquant sur un bouton tout en bas (hors écran par rapport au bandeau
    // du haut) passerait inaperçue.
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const runAction = async (action: RecipeFormAction) => {
    setError(null);
    if (!title.trim()) {
      showError('Le titre est obligatoire.');
      return;
    }
    if (ingredients.length === 0) {
      showError('Ajoutez au moins un ingrédient.');
      return;
    }
    setSaving(action);
    try {
      await onSubmit(
        {
          title,
          description: description || undefined,
          servings,
          coverPhotoUrl: coverPhotoUrl || undefined,
          ingredients: ingredients.map((i) => ({ foodId: i.foodId, quantity: i.grams, unit: 'gramme' })),
          steps: steps
            .map((instruction, i) => ({ stepNumber: i + 1, instruction: instruction.trim() }))
            .filter((s) => s.instruction.length > 0),
        },
        action.publish,
      );
    } catch (err) {
      showError(err instanceof ApiError ? err.message : 'Une erreur est survenue.');
    } finally {
      setSaving(null);
    }
  };

  return (
    <div>
      <h1>{heading}</h1>
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
        <div className="field">
          <label htmlFor="cover-photo">Photo de la recette</label>
          {photoError && <div className="error-banner">{photoError}</div>}
          {coverPhotoUrl && (
            <div style={{ marginBottom: 10 }}>
              <img
                src={coverPhotoUrl}
                alt="Aperçu de la recette"
                style={{ maxWidth: '100%', maxHeight: 240, borderRadius: 12, display: 'block' }}
              />
              <button
                type="button"
                className="btn btn--ghost"
                style={{ marginTop: 8 }}
                onClick={() => setCoverPhotoUrl(null)}
              >
                Retirer la photo
              </button>
            </div>
          )}
          <input id="cover-photo" type="file" accept="image/*" onChange={onPickPhoto} />
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
            {ing.quantityGuessed && (
              <p style={{ margin: '2px 0', fontSize: '0.8rem', color: 'var(--color-down)' }}>
                Quantité non précisée dans le texte, estimée à 100 g — à vérifier.
              </p>
            )}
            {ing.alternatives && ing.alternatives.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', margin: '4px 0' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Pas le bon aliment ?</span>
                {ing.alternatives.map((alt) => (
                  <button
                    key={alt.id}
                    type="button"
                    className="btn btn--ghost"
                    style={{ padding: '2px 10px', fontSize: '0.8rem' }}
                    onClick={() => swapIngredient(index, alt)}
                  >
                    {alt.name}
                  </button>
                ))}
              </div>
            )}
            <CookedEquivalentHint foodId={ing.foodId} foodState={ing.state} onSwap={(food) => swapIngredient(index, food)} />
          </div>
        ))}

        <div className="field">
          <label htmlFor="ingredientText">
            Décrire les ingrédients (ex. "200g de poulet cru, 150g de riz cru et 250g de haricots verts")
          </label>
          <textarea
            id="ingredientText"
            rows={2}
            value={ingredientText}
            onChange={(e) => setIngredientText(e.target.value)}
          />
          {parseWarnings.length > 0 && (
            <div className="error-banner">
              Non reconnu, à ajouter manuellement : {parseWarnings.join(' · ')}
            </div>
          )}
          <button type="button" className="btn btn--ghost" onClick={parseIngredientText} disabled={parsing || !ingredientText.trim()}>
            {parsing ? 'Analyse...' : 'Analyser et ajouter'}
          </button>
        </div>

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

      {error && <div className="error-banner">{error}</div>}

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {actions.map((action) => (
          <button
            key={action.label}
            className={action.variant === 'ghost' ? 'btn btn--ghost' : 'btn'}
            onClick={() => runAction(action)}
            disabled={saving !== null}
          >
            {saving === action ? action.savingLabel : action.label}
          </button>
        ))}
      </div>
    </div>
  );
}

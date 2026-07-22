import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError } from '../api/client';
import { FeedItem, FoodDiaryResponse, FoodSearchResult, NutritionSummaryBucket, UserProfile } from '../api/types';
import { FoodSearch } from '../components/FoodSearch';
import { RecipeSearch } from '../components/RecipeSearch';
import { RingChart } from '../components/RingChart';
import { todayLocalISO } from '../lib/date';

const MEAL_LABELS: Record<string, string> = {
  petit_dejeuner: 'Petit-déjeuner',
  dejeuner: 'Déjeuner',
  diner: 'Dîner',
  collation: 'Collation',
  dessert: 'Dessert',
  post_entrainement: 'Post-entraînement',
};

const SUMMARY_DAY_FORMAT = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit' });
const SUMMARY_MONTH_FORMAT = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' });

function summaryLabel(dateStr: string, granularity: 'day' | 'week' | 'month'): string {
  const date = new Date(`${dateStr}T00:00:00`);
  if (granularity === 'month') return SUMMARY_MONTH_FORMAT.format(date);
  if (granularity === 'week') return `Semaine du ${SUMMARY_DAY_FORMAT.format(date)}`;
  return SUMMARY_DAY_FORMAT.format(date);
}

const SECTIONS = ["Aujourd'hui", 'Récapitulatif'] as const;
type Section = (typeof SECTIONS)[number];

// Page d'accueil de l'app pour un utilisateur connecté : le suivi des
// macros consommées est désormais l'objectif principal de la plateforme,
// le partage de recettes passant au second plan (voir le lien "Recettes"
// dans la navigation).
export function DashboardPage() {
  const [section, setSection] = useState<Section>("Aujourd'hui");
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [diaryDate, setDiaryDate] = useState(todayLocalISO());
  const [foodDiary, setFoodDiary] = useState<FoodDiaryResponse | null>(null);
  const [logMode, setLogMode] = useState<'food' | 'recipe'>('food');
  const [logMeal, setLogMeal] = useState('dejeuner');
  const [pendingFood, setPendingFood] = useState<{ food: FoodSearchResult; quantity: number } | null>(null);
  const [pendingRecipe, setPendingRecipe] = useState<{ recipe: FeedItem; servings: number } | null>(null);
  const [logSaving, setLogSaving] = useState(false);
  const [logError, setLogError] = useState<string | null>(null);
  const [summaryGranularity, setSummaryGranularity] = useState<'day' | 'week' | 'month'>('day');
  const [summaryCount, setSummaryCount] = useState(7);
  const [summary, setSummary] = useState<NutritionSummaryBucket[] | null>(null);

  useEffect(() => {
    api.get<UserProfile>('/me').then(setProfile);
  }, []);

  const loadFoodDiary = (date: string) => {
    api.get<FoodDiaryResponse>(`/me/food-diary?date=${date}`).then(setFoodDiary);
  };

  useEffect(() => {
    loadFoodDiary(diaryDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [diaryDate]);

  // Repasse à zéro sans avoir à recharger la page si minuit sonne pendant
  // que l'onglet reste ouvert : on compare régulièrement la date locale.
  useEffect(() => {
    const interval = setInterval(() => {
      const now = todayLocalISO();
      setDiaryDate((prev) => (prev !== now ? now : prev));
    }, 30_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const today = todayLocalISO();
    api
      .get<NutritionSummaryBucket[]>(
        `/me/nutrition-summary?granularity=${summaryGranularity}&count=${summaryCount}&today=${today}`,
      )
      .then(setSummary);
  }, [summaryGranularity, summaryCount]);

  const selectSummaryRange = (g: 'day' | 'week' | 'month', c: number) => {
    setSummaryGranularity(g);
    setSummaryCount(c);
  };

  const addFoodEntry = async () => {
    if (!pendingFood) return;
    setLogSaving(true);
    setLogError(null);
    try {
      await api.post('/me/food-diary', {
        date: diaryDate,
        meal: logMeal,
        foodId: pendingFood.food.id,
        quantity: pendingFood.quantity,
        unit: 'gramme',
      });
      setPendingFood(null);
      loadFoodDiary(diaryDate);
    } catch (err) {
      setLogError(err instanceof ApiError ? err.message : 'Une erreur est survenue.');
    } finally {
      setLogSaving(false);
    }
  };

  const addRecipeEntry = async () => {
    if (!pendingRecipe) return;
    setLogSaving(true);
    setLogError(null);
    try {
      await api.post('/me/food-diary', {
        date: diaryDate,
        meal: logMeal,
        recipeId: pendingRecipe.recipe.id,
        servingsConsumed: pendingRecipe.servings,
      });
      setPendingRecipe(null);
      loadFoodDiary(diaryDate);
    } catch (err) {
      setLogError(err instanceof ApiError ? err.message : 'Une erreur est survenue.');
    } finally {
      setLogSaving(false);
    }
  };

  const deleteDiaryEntry = async (id: string) => {
    await api.delete(`/me/food-diary/${id}`);
    loadFoodDiary(diaryDate);
  };

  if (!profile) return <p>Chargement...</p>;

  return (
    <div>
      <h1>Suivi nutritionnel</h1>
      <div className="macro-row" style={{ marginBottom: 20 }}>
        {SECTIONS.map((s) => (
          <button key={s} className={s === section ? 'btn' : 'btn btn--ghost'} onClick={() => setSection(s)}>
            {s}
          </button>
        ))}
      </div>

      {section === "Aujourd'hui" && (
        <div>
          <div className="card" style={{ display: 'flex', justifyContent: 'center', gap: 32, flexWrap: 'wrap' }}>
            <RingChart
              value={foodDiary?.totals.calories ?? 0}
              target={profile.nutritionTarget?.daily_calories_target ?? null}
              label="Calories"
              unit=" kcal"
            />
            <RingChart
              value={foodDiary?.totals.protein ?? 0}
              target={profile.nutritionTarget?.daily_protein_g_target ?? null}
              label="Protéines"
              unit=" g"
            />
          </div>
          {!profile.nutritionTarget?.daily_calories_target && !profile.nutritionTarget?.daily_protein_g_target && (
            <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
              Définis tes objectifs quotidiens dans l'onglet <Link to="/profil">Infos</Link> pour suivre ta
              progression.
            </p>
          )}

          <div className="card">
            <h2>Ajouter une entrée</h2>
            {logError && <div className="error-banner">{logError}</div>}
            <div className="macro-row" style={{ marginBottom: 14 }}>
              <button className={logMode === 'food' ? 'btn' : 'btn btn--ghost'} onClick={() => setLogMode('food')}>
                Aliment
              </button>
              <button className={logMode === 'recipe' ? 'btn' : 'btn btn--ghost'} onClick={() => setLogMode('recipe')}>
                Une de mes recettes
              </button>
            </div>
            <div className="field">
              <label htmlFor="logMeal">Repas</label>
              <select id="logMeal" value={logMeal} onChange={(e) => setLogMeal(e.target.value)}>
                {Object.entries(MEAL_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {logMode === 'food' ? (
              <>
                <FoodSearch onPick={(food) => setPendingFood({ food, quantity: 100 })} />
                {pendingFood && (
                  <div className="ingredient-row">
                    <span className="ingredient-row__name">{pendingFood.food.name}</span>
                    <input
                      type="number"
                      min={0}
                      value={pendingFood.quantity}
                      onChange={(e) => setPendingFood({ ...pendingFood, quantity: Number(e.target.value) })}
                    />
                    <span>g</span>
                    <button className="btn" onClick={addFoodEntry} disabled={logSaving}>
                      {logSaving ? 'Ajout...' : 'Ajouter'}
                    </button>
                  </div>
                )}
              </>
            ) : (
              <>
                <RecipeSearch onPick={(recipe) => setPendingRecipe({ recipe, servings: 1 })} />
                {pendingRecipe && (
                  <div className="ingredient-row">
                    <span className="ingredient-row__name">{pendingRecipe.recipe.title}</span>
                    <input
                      type="number"
                      min={0}
                      step={0.5}
                      value={pendingRecipe.servings}
                      onChange={(e) => setPendingRecipe({ ...pendingRecipe, servings: Number(e.target.value) })}
                    />
                    <span>portion(s)</span>
                    <button className="btn" onClick={addRecipeEntry} disabled={logSaving}>
                      {logSaving ? 'Ajout...' : 'Ajouter'}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="card">
            <h2>Entrées du jour</h2>
            {foodDiary === null ? (
              <p>Chargement...</p>
            ) : foodDiary.entries.length === 0 ? (
              <p className="empty-state">Rien d'enregistré aujourd'hui.</p>
            ) : (
              foodDiary.entries.map((entry) => (
                <div key={entry.id} className="ingredient-row">
                  <span className="ingredient-row__name">
                    {MEAL_LABELS[entry.meal] ?? entry.meal} — {entry.label}
                    {entry.servingsConsumed
                      ? ` (${entry.servingsConsumed} portion${entry.servingsConsumed > 1 ? 's' : ''})`
                      : entry.quantity
                        ? ` (${entry.quantity} g)`
                        : ''}
                  </span>
                  <span className="macro-pill">{entry.macros.calories} kcal</span>
                  <span className="macro-pill">{entry.macros.protein} g prot.</span>
                  <button className="btn btn--ghost" onClick={() => deleteDiaryEntry(entry.id)}>
                    ✕
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {section === 'Récapitulatif' && (
        <div className="card">
          <div className="macro-row" style={{ marginBottom: 16 }}>
            <button
              className={summaryGranularity === 'day' && summaryCount === 7 ? 'btn' : 'btn btn--ghost'}
              onClick={() => selectSummaryRange('day', 7)}
            >
              7 derniers jours
            </button>
            <button
              className={summaryGranularity === 'day' && summaryCount === 30 ? 'btn' : 'btn btn--ghost'}
              onClick={() => selectSummaryRange('day', 30)}
            >
              30 derniers jours
            </button>
            <button
              className={summaryGranularity === 'week' && summaryCount === 12 ? 'btn' : 'btn btn--ghost'}
              onClick={() => selectSummaryRange('week', 12)}
            >
              12 dernières semaines
            </button>
            <button
              className={summaryGranularity === 'month' && summaryCount === 12 ? 'btn' : 'btn btn--ghost'}
              onClick={() => selectSummaryRange('month', 12)}
            >
              12 derniers mois
            </button>
          </div>

          {summary === null ? (
            <p>Chargement...</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontVariantNumeric: 'tabular-nums' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--color-border)', textAlign: 'right' }}>
                    <th style={{ textAlign: 'left', padding: '6px 8px', color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
                      Période
                    </th>
                    <th style={{ padding: '6px 8px', color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>Kcal</th>
                    <th style={{ padding: '6px 8px', color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>Protéines</th>
                    <th style={{ padding: '6px 8px', color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>Glucides</th>
                    <th style={{ padding: '6px 8px', color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>Lipides</th>
                  </tr>
                </thead>
                <tbody>
                  {[...summary]
                    .reverse()
                    .map((bucket) => (
                      <tr key={bucket.date} style={{ borderBottom: '1px solid var(--color-border)' }}>
                        <td style={{ padding: '6px 8px' }}>{summaryLabel(bucket.date, summaryGranularity)}</td>
                        <td style={{ padding: '6px 8px', textAlign: 'right' }}>{bucket.calories}</td>
                        <td style={{ padding: '6px 8px', textAlign: 'right' }}>{bucket.protein} g</td>
                        <td style={{ padding: '6px 8px', textAlign: 'right' }}>{bucket.carbs} g</td>
                        <td style={{ padding: '6px 8px', textAlign: 'right' }}>{bucket.fat} g</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

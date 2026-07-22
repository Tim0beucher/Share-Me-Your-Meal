import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError } from '../api/client';
import { ActivityBucket, Collection, FeedItem, FoodDiaryResponse, FoodSearchResult, RecipeSummary, UserProfile } from '../api/types';
import { ActivityChart } from '../components/ActivityChart';
import { FoodSearch } from '../components/FoodSearch';
import { RecipeSearch } from '../components/RecipeSearch';
import { RingChart } from '../components/RingChart';
import { todayLocalISO } from '../lib/date';
import { applyAccent } from '../theme';

const NUTRITION_GOAL_LABELS: Record<string, string> = {
  perte_de_poids: 'Perte de poids',
  maintien_du_poids: 'Maintien du poids',
  prise_de_masse: 'Prise de masse',
  alimentation_equilibree: 'Alimentation équilibrée',
  performance_sportive: 'Performance sportive',
};

const MEAL_LABELS: Record<string, string> = {
  petit_dejeuner: 'Petit-déjeuner',
  dejeuner: 'Déjeuner',
  diner: 'Dîner',
  collation: 'Collation',
  dessert: 'Dessert',
  post_entrainement: 'Post-entraînement',
};

const TABS = ["Aujourd'hui", 'Infos', 'Mes recettes', 'Aimées', 'Enregistrées', 'Playlists', 'Activité'] as const;
type Tab = (typeof TABS)[number];

function RecipeSummaryRow({ recipe }: { recipe: RecipeSummary }) {
  return (
    <Link to={`/recipes/${recipe.id}`} className="card recipe-card">
      <h3 className="recipe-card__title">
        {recipe.title} {recipe.status === 'brouillon' && <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>(brouillon)</span>}
      </h3>
      <div className="macro-row">
        <span className="macro-pill">{recipe.total_calories_kcal} kcal</span>
        <span className="macro-pill">{recipe.total_protein_g} g protéines</span>
        <span className="macro-pill">{recipe.servings} portion{recipe.servings > 1 ? 's' : ''}</span>
      </div>
    </Link>
  );
}

export function ProfilePage() {
  const [tab, setTab] = useState<Tab>("Aujourd'hui");
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [diaryDate, setDiaryDate] = useState(todayLocalISO());
  const [foodDiary, setFoodDiary] = useState<FoodDiaryResponse | null>(null);
  const [logMode, setLogMode] = useState<'food' | 'recipe'>('food');
  const [logMeal, setLogMeal] = useState('dejeuner');
  const [pendingFood, setPendingFood] = useState<{ food: FoodSearchResult; quantity: number } | null>(null);
  const [pendingRecipe, setPendingRecipe] = useState<{ recipe: FeedItem; servings: number } | null>(null);
  const [logSaving, setLogSaving] = useState(false);
  const [logError, setLogError] = useState<string | null>(null);
  const [myRecipes, setMyRecipes] = useState<RecipeSummary[] | null>(null);
  const [liked, setLiked] = useState<RecipeSummary[] | null>(null);
  const [saved, setSaved] = useState<RecipeSummary[] | null>(null);
  const [collections, setCollections] = useState<Collection[] | null>(null);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [granularity, setGranularity] = useState<'day' | 'week' | 'month'>('day');
  const [count, setCount] = useState(7);
  const [activity, setActivity] = useState<ActivityBucket[] | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    api.get<UserProfile>('/me').then(setProfile);
    api.get<RecipeSummary[]>('/me/recipes').then(setMyRecipes);
    api.get<RecipeSummary[]>('/me/liked-recipes').then(setLiked);
    api.get<RecipeSummary[]>('/me/saved-recipes').then(setSaved);
    api.get<Collection[]>('/me/collections').then(setCollections);
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

  useEffect(() => {
    api.get<ActivityBucket[]>(`/me/activity?granularity=${granularity}&count=${count}`).then(setActivity);
  }, [granularity, count]);

  const selectRange = (g: 'day' | 'week' | 'month', c: number) => {
    setGranularity(g);
    setCount(c);
  };

  const saveProfile = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!profile) return;
    setError(null);
    setSuccess(null);
    setSavingProfile(true);
    const form = new FormData(e.currentTarget);
    const body: Record<string, unknown> = {};
    const phoneNumber = form.get('phoneNumber');
    const sex = form.get('sex');
    const birthDate = form.get('birthDate');
    const heightCm = form.get('heightCm');
    const weightKg = form.get('weightKg');
    const nutritionGoal = form.get('nutritionGoal');
    const dailyCaloriesTarget = form.get('dailyCaloriesTarget');
    const dailyProteinGTarget = form.get('dailyProteinGTarget');
    if (phoneNumber) body.phoneNumber = phoneNumber;
    if (sex) body.sex = sex;
    if (birthDate) body.birthDate = birthDate;
    if (heightCm) body.heightCm = Number(heightCm);
    if (weightKg) body.weightKg = Number(weightKg);
    if (nutritionGoal) body.nutritionGoal = nutritionGoal;
    if (dailyCaloriesTarget) body.dailyCaloriesTarget = Number(dailyCaloriesTarget);
    if (dailyProteinGTarget) body.dailyProteinGTarget = Number(dailyProteinGTarget);

    try {
      const updated = await api.patch<UserProfile>('/me', body);
      setProfile(updated);
      setSuccess('Profil mis à jour.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Une erreur est survenue.');
    } finally {
      setSavingProfile(false);
    }
  };

  // Appliquée et enregistrée immédiatement (pas besoin de cliquer sur
  // "Enregistrer") : c'est un réglage d'apparence, pas une donnée de profil
  // qu'on remplit avant de valider.
  const changeAccentColor = async (hex: string) => {
    applyAccent(hex);
    try {
      const updated = await api.patch<UserProfile>('/me', { accentColor: hex });
      setProfile(updated);
    } catch {
      // aperçu déjà appliqué localement ; un raté réseau ici n'est pas bloquant
    }
  };

  const createCollection = async () => {
    if (!newCollectionName.trim()) return;
    const collection = await api.post<Collection>('/me/collections', { name: newCollectionName.trim() });
    setCollections((prev) => [{ ...collection, recipe_count: 0 }, ...(prev ?? [])]);
    setNewCollectionName('');
  };

  if (!profile) return <p>Chargement du profil...</p>;

  return (
    <div>
      <h1>Mon espace personnel</h1>
      <div className="macro-row" style={{ marginBottom: 20 }}>
        {TABS.map((t) => (
          <button key={t} className={t === tab ? 'btn' : 'btn btn--ghost'} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>

      {tab === "Aujourd'hui" && (
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
              Définis tes objectifs quotidiens dans l'onglet "Infos" pour suivre ta progression.
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

      {tab === 'Infos' && (
        <>
          <div className="card">
            <label htmlFor="accentColor" style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)', display: 'block', marginBottom: 8 }}>
              Couleur d'accent
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <input
                id="accentColor"
                type="color"
                value={profile.accent_color ?? '#2f6bff'}
                onChange={(e) => changeAccentColor(e.target.value)}
                style={{ width: 40, height: 40, padding: 0, border: '2px solid var(--color-border)', borderRadius: '50%', cursor: 'pointer', background: 'none' }}
              />
              <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                Appliquée immédiatement, partout dans l'app.
              </span>
            </div>
          </div>
          <div className="card">
            {error && <div className="error-banner">{error}</div>}
            {success && <p style={{ color: 'var(--color-good)' }}>{success}</p>}
            <form onSubmit={saveProfile}>
            <div className="field">
              <label>Pseudo</label>
              <input value={profile.pseudo} disabled />
            </div>
            <div className="field">
              <label>E-mail</label>
              <input value={profile.email} disabled />
            </div>
            <div className="field">
              <label htmlFor="phoneNumber">Téléphone</label>
              <input id="phoneNumber" name="phoneNumber" defaultValue={profile.phone_number ?? ''} />
            </div>
            <div className="field">
              <label htmlFor="sex">Sexe</label>
              <select id="sex" name="sex" defaultValue={profile.sex ?? ''}>
                <option value="">Non précisé</option>
                <option value="femme">Femme</option>
                <option value="homme">Homme</option>
                <option value="autre">Autre</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="birthDate">Date de naissance</label>
              <input id="birthDate" name="birthDate" type="date" defaultValue={profile.birth_date ?? ''} />
            </div>
            <div className="field">
              <label htmlFor="heightCm">Taille (cm)</label>
              <input id="heightCm" name="heightCm" type="number" step="0.1" defaultValue={profile.height_cm ?? ''} />
            </div>
            <div className="field">
              <label htmlFor="weightKg">Poids (kg)</label>
              <input id="weightKg" name="weightKg" type="number" step="0.1" defaultValue={profile.weight_kg ?? ''} />
            </div>
            <div className="field">
              <label htmlFor="nutritionGoal">Objectif nutritionnel</label>
              <select id="nutritionGoal" name="nutritionGoal" defaultValue={profile.nutritionTarget?.goal ?? ''}>
                <option value="">— Choisir —</option>
                {Object.entries(NUTRITION_GOAL_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="dailyCaloriesTarget">Objectif calories / jour</label>
              <input
                id="dailyCaloriesTarget"
                name="dailyCaloriesTarget"
                type="number"
                defaultValue={profile.nutritionTarget?.daily_calories_target ?? ''}
              />
            </div>
            <div className="field">
              <label htmlFor="dailyProteinGTarget">Objectif protéines / jour (g)</label>
              <input
                id="dailyProteinGTarget"
                name="dailyProteinGTarget"
                type="number"
                defaultValue={profile.nutritionTarget?.daily_protein_g_target ?? ''}
              />
            </div>
            <button className="btn" type="submit" disabled={savingProfile}>
              {savingProfile ? 'Enregistrement...' : 'Enregistrer'}
            </button>
            </form>
          </div>
        </>
      )}

      {tab === 'Mes recettes' && (
        <div>{myRecipes === null ? <p>Chargement...</p> : myRecipes.length === 0 ? <p className="empty-state">Aucune recette postée.</p> : myRecipes.map((r) => <RecipeSummaryRow key={r.id} recipe={r} />)}</div>
      )}

      {tab === 'Aimées' && (
        <div>{liked === null ? <p>Chargement...</p> : liked.length === 0 ? <p className="empty-state">Aucune recette aimée.</p> : liked.map((r) => <RecipeSummaryRow key={r.id} recipe={r} />)}</div>
      )}

      {tab === 'Enregistrées' && (
        <div>{saved === null ? <p>Chargement...</p> : saved.length === 0 ? <p className="empty-state">Aucune recette enregistrée.</p> : saved.map((r) => <RecipeSummaryRow key={r.id} recipe={r} />)}</div>
      )}

      {tab === 'Playlists' && (
        <div>
          <div className="card">
            <div className="field">
              <label htmlFor="newCollection">Nouvelle playlist</label>
              <input
                id="newCollection"
                value={newCollectionName}
                onChange={(e) => setNewCollectionName(e.target.value)}
                placeholder="ex. Recettes pour la semaine"
              />
            </div>
            <button className="btn" onClick={createCollection}>
              Créer
            </button>
          </div>
          {collections === null ? (
            <p>Chargement...</p>
          ) : collections.length === 0 ? (
            <p className="empty-state">Aucune playlist pour l'instant.</p>
          ) : (
            collections.map((c) => (
              <div key={c.id} className="card">
                <strong>{c.name}</strong>
                <p style={{ color: 'var(--color-text-muted)', margin: '4px 0 0' }}>
                  {c.recipe_count} recette{c.recipe_count > 1 ? 's' : ''}
                </p>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'Activité' && (
        <div className="card">
          <div className="macro-row" style={{ marginBottom: 16 }}>
            <button className={granularity === 'day' && count === 7 ? 'btn' : 'btn btn--ghost'} onClick={() => selectRange('day', 7)}>
              7 derniers jours
            </button>
            <button className={granularity === 'day' && count === 30 ? 'btn' : 'btn btn--ghost'} onClick={() => selectRange('day', 30)}>
              30 derniers jours
            </button>
            <button className={granularity === 'week' && count === 12 ? 'btn' : 'btn btn--ghost'} onClick={() => selectRange('week', 12)}>
              12 dernières semaines
            </button>
            <button className={granularity === 'month' && count === 12 ? 'btn' : 'btn btn--ghost'} onClick={() => selectRange('month', 12)}>
              12 derniers mois
            </button>
          </div>
          {activity === null ? (
            <p>Chargement...</p>
          ) : (
            <>
              <p style={{ color: 'var(--color-text-muted)' }}>
                {activity.reduce((sum, b) => sum + b.count, 0)} recette(s) cuisinée(s) sur la période.
              </p>
              <ActivityChart buckets={activity} granularity={granularity} />
            </>
          )}
        </div>
      )}
    </div>
  );
}

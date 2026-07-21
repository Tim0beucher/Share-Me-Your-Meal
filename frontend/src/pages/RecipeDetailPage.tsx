import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { RecipeDetail } from '../api/types';
import { AdaptModal } from '../components/AdaptModal';
import { MacroGrid } from '../components/MacroGrid';
import { useAuth } from '../auth/AuthContext';

export function RecipeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [recipe, setRecipe] = useState<RecipeDetail | null>(null);
  const [showAdapt, setShowAdapt] = useState(false);
  const [liked, setLiked] = useState(false);
  const [cookedJustNow, setCookedJustNow] = useState(false);

  useEffect(() => {
    if (!id) return;
    setRecipe(null);
    // Repart de zéro à chaque changement de recette : le like n'est pas
    // encore renvoyé par GET /recipes/:id (pas de suivi par utilisateur
    // côté API pour l'instant), donc l'état local ne peut refléter que les
    // actions faites depuis cette page, pas un like déjà existant en base.
    setLiked(false);
    setCookedJustNow(false);
    api.get<RecipeDetail>(`/recipes/${id}`).then(setRecipe);
  }, [id]);

  if (!recipe) return <p>Chargement de la recette...</p>;

  const toggleLike = async () => {
    if (!user) return navigate('/login');
    if (liked) {
      await api.delete(`/recipes/${recipe.id}/like`);
    } else {
      await api.post(`/recipes/${recipe.id}/like`);
    }
    setLiked(!liked);
  };

  const markCooked = async () => {
    if (!user) return navigate('/login');
    await api.post(`/recipes/${recipe.id}/cook-events`);
    setCookedJustNow(true);
  };

  return (
    <div>
      <h1>{recipe.title}</h1>
      {recipe.originalRecipeId && (
        <p>
          🔀 Adaptation de <Link to={`/recipes/${recipe.originalRecipeId}`}>cette recette</Link>
        </p>
      )}
      {recipe.description && <p>{recipe.description}</p>}
      <p style={{ color: 'var(--color-text-muted)' }}>
        {recipe.servings} portion{recipe.servings > 1 ? 's' : ''}
        {recipe.adaptedCount !== undefined && recipe.adaptedCount > 0 && ` · adaptée ${recipe.adaptedCount} fois`}
      </p>

      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <button className="btn" onClick={() => (user ? setShowAdapt(true) : navigate('/login'))}>
          Adapter la recette
        </button>
        <button className="btn btn--ghost" onClick={toggleLike}>
          {liked ? '❤️ Aimé' : '🤍 Aimer'}
        </button>
        <button className="btn btn--ghost" onClick={markCooked} disabled={cookedJustNow}>
          {cookedJustNow ? '✅ Cuisinée aujourd\'hui' : '🍳 J\'ai cuisiné ça'}
        </button>
      </div>

      <div className="card">
        <h2>Ingrédients</h2>
        {recipe.ingredients.map((ing) => (
          <div key={ing.foodId} className="ingredient-row">
            <span className="ingredient-row__name">{ing.name}</span>
            <span>{ing.grams} g</span>
          </div>
        ))}
      </div>

      {recipe.steps && recipe.steps.length > 0 && (
        <div className="card">
          <h2>Préparation</h2>
          <ol className="steps-list">
            {recipe.steps.map((s) => (
              <li key={s.step_number}>{s.instruction}</li>
            ))}
          </ol>
        </div>
      )}

      <div className="card">
        <h2>Valeurs nutritionnelles</h2>
        <MacroGrid title="Total" macros={recipe.macros.total} />
        <MacroGrid title={`Par portion (${recipe.servings})`} macros={recipe.macros.perServing} />
        <MacroGrid title="Pour 100 g" macros={recipe.macros.per100g} />
        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
          Valeurs estimées à partir de la table CIQUAL (ANSES) ; elles ne remplacent pas l'avis d'un professionnel de
          santé.
        </p>
      </div>

      {showAdapt && <AdaptModal recipe={recipe} onClose={() => setShowAdapt(false)} />}
    </div>
  );
}

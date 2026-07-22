import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { RecipeDetail } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { RecipeForm, RecipeFormPayload } from '../components/RecipeForm';

export function EditRecipePage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [recipe, setRecipe] = useState<RecipeDetail | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;
    api
      .get<RecipeDetail>(`/recipes/${id}`)
      .then(setRecipe)
      .catch(() => setNotFound(true));
  }, [id]);

  if (notFound) return <p>Recette introuvable.</p>;
  if (!recipe) return <p>Chargement de la recette...</p>;
  if (!user || user.id !== recipe.authorId) {
    return <p>Vous ne pouvez modifier que vos propres recettes.</p>;
  }

  const handleSubmit = async (payload: RecipeFormPayload, publish: boolean) => {
    const result = await api.patch<RecipeDetail>(`/recipes/${id}`, { ...payload, publish });
    navigate(`/recipes/${result.id}`);
  };

  return (
    <RecipeForm
      heading="Modifier la recette"
      initialTitle={recipe.title}
      initialDescription={recipe.description ?? ''}
      initialServings={recipe.servings}
      initialCoverPhotoUrl={recipe.coverPhotoUrl}
      initialIngredients={recipe.ingredients.map((ing) => ({
        foodId: ing.foodId,
        name: ing.name,
        state: ing.state,
        grams: ing.grams,
        per100g: ing.per100g,
      }))}
      initialSteps={
        recipe.steps?.length
          ? [...recipe.steps].sort((a, b) => a.step_number - b.step_number).map((s) => s.instruction)
          : ['']
      }
      onSubmit={handleSubmit}
      actions={[{ label: 'Enregistrer les modifications', savingLabel: 'Enregistrement...', publish: true, variant: 'primary' }]}
    />
  );
}

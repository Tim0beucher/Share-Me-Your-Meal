import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { RecipeDetail } from '../api/types';
import { RecipeForm, RecipeFormPayload } from '../components/RecipeForm';

export function CreateRecipePage() {
  const navigate = useNavigate();

  const handleSubmit = async (payload: RecipeFormPayload, publish: boolean) => {
    const result = await api.post<RecipeDetail>('/recipes', { ...payload, publish });
    navigate(`/recipes/${result.id}`);
  };

  return (
    <RecipeForm
      heading="Créer une recette"
      onSubmit={handleSubmit}
      actions={[
        { label: 'Publier la recette', savingLabel: 'Publication...', publish: true, variant: 'primary' },
        { label: 'Enregistrer en brouillon', savingLabel: 'Enregistrement...', publish: false, variant: 'ghost' },
      ]}
    />
  );
}

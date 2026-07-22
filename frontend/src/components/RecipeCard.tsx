import { Link } from 'react-router-dom';
import { FeedItem } from '../api/types';

export function RecipeCard({ recipe }: { recipe: FeedItem }) {
  return (
    <Link to={`/recipes/${recipe.id}`} className="card recipe-card">
      {recipe.coverPhotoUrl && (
        <img src={recipe.coverPhotoUrl} alt="" className="recipe-card__photo" />
      )}
      <h3 className="recipe-card__title">
        {recipe.title} {recipe.isAdaptation && <span title="Adaptation d'une autre recette">🔀</span>}
      </h3>
      <p className="recipe-card__meta">
        par {recipe.author} · {recipe.servings} portion{recipe.servings > 1 ? 's' : ''}
        {recipe.prepTimeMinutes ? ` · ${recipe.prepTimeMinutes} min` : ''}
      </p>
      <div className="macro-row">
        <span className="macro-pill">{recipe.macros.calories} kcal</span>
        <span className="macro-pill">{recipe.macros.protein} g protéines</span>
        <span className="macro-pill">❤️ {recipe.likeCount}</span>
        <span className="macro-pill">🔖 {recipe.saveCount}</span>
      </div>
    </Link>
  );
}

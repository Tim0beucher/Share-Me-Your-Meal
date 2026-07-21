import { MacroSet } from '../api/types';

export function MacroGrid({ macros, title }: { macros: Pick<MacroSet, 'calories' | 'protein' | 'carbs' | 'fat'>; title?: string }) {
  return (
    <div>
      {title && <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)', margin: '0 0 4px' }}>{title}</p>}
      <div className="macro-grid">
        <div className="macro-grid__item">
          <span className="macro-grid__value">{macros.calories}</span>
          <span className="macro-grid__label">kcal</span>
        </div>
        <div className="macro-grid__item">
          <span className="macro-grid__value">{macros.protein} g</span>
          <span className="macro-grid__label">protéines</span>
        </div>
        <div className="macro-grid__item">
          <span className="macro-grid__value">{macros.carbs} g</span>
          <span className="macro-grid__label">glucides</span>
        </div>
        <div className="macro-grid__item">
          <span className="macro-grid__value">{macros.fat} g</span>
          <span className="macro-grid__label">lipides</span>
        </div>
      </div>
    </div>
  );
}

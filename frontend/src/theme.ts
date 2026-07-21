const STORAGE_KEY = 'accentColor';
export const DEFAULT_ACCENT = '#2f6bff';

// Choisit un texte de bouton clair ou sombre selon la luminance perçue de
// la couleur d'accent : celle-ci est arbitraire (choisie par l'utilisateur),
// il n'y a donc pas d'encre pré-calculée comme pour une palette fixe.
function inkFor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.55 ? '#04070f' : '#f5f7fb';
}

export function applyAccent(hex: string) {
  document.documentElement.style.setProperty('--color-primary', hex);
  document.documentElement.style.setProperty('--color-primary-ink', inkFor(hex));
  localStorage.setItem(STORAGE_KEY, hex);
}

export function getCachedAccent(): string {
  return localStorage.getItem(STORAGE_KEY) ?? DEFAULT_ACCENT;
}

export function resetAccent() {
  localStorage.removeItem(STORAGE_KEY);
  applyAccent(DEFAULT_ACCENT);
}

// Date locale (pas UTC comme le ferait toISOString()) : "aujourd'hui" doit
// correspondre au minuit de l'utilisateur, pas à celui du serveur.
export function todayLocalISO(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

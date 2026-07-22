export function LegalNoticePage() {
  return (
    <div>
      <h1>Mentions légales</h1>

      <div className="card">
        <h2>Éditeur</h2>
        <p>
          Cette application est un projet personnel, non commercial, édité par Timothé Beucher. Pour toute question,
          contactez : <a href="mailto:timothebeucher@gmail.com">timothebeucher@gmail.com</a>.
        </p>
      </div>

      <div className="card">
        <h2>Hébergement</h2>
        <p>L'application est hébergée par trois prestataires distincts :</p>
        <ul>
          <li>
            <strong>Frontend (interface web)</strong> — Vercel Inc., San Francisco, États-Unis (
            <a href="https://vercel.com" target="_blank" rel="noreferrer">
              vercel.com
            </a>
            )
          </li>
          <li>
            <strong>Backend (serveur applicatif)</strong> — Render Services Inc., San Francisco, États-Unis (
            <a href="https://render.com" target="_blank" rel="noreferrer">
              render.com
            </a>
            )
          </li>
          <li>
            <strong>Base de données</strong> — Neon Inc., San Francisco, États-Unis (
            <a href="https://neon.tech" target="_blank" rel="noreferrer">
              neon.tech
            </a>
            )
          </li>
        </ul>
      </div>

      <div className="card">
        <h2>Contenu et propriété intellectuelle</h2>
        <p>
          Les recettes, descriptions, commentaires et photos publiés sur l'application sont créés par les
          utilisateurs, qui en restent responsables. En publiant du contenu, chaque utilisateur autorise son
          affichage au sein de l'application, dans les limites de visibilité qu'il a choisies (publique ou privée).
        </p>
      </div>

      <div className="card">
        <h2>Valeurs nutritionnelles</h2>
        <p>
          Les valeurs nutritionnelles affichées sont calculées automatiquement à partir de la table de composition
          nutritionnelle CIQUAL (ANSES, édition 2020) et de formules de calcul standard. Elles sont fournies à titre
          indicatif et ne remplacent pas l'avis d'un professionnel de santé ou d'un diététicien.
        </p>
      </div>
    </div>
  );
}

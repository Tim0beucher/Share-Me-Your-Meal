export function PrivacyPolicyPage() {
  return (
    <div>
      <h1>Politique de confidentialité</h1>

      <div className="card">
        <h2>Responsable du traitement</h2>
        <p>
          Timothé Beucher, éditeur de l'application, est responsable du traitement des données décrites ci-dessous.
          Contact : <a href="mailto:timothebeucher@gmail.com">timothebeucher@gmail.com</a>.
        </p>
      </div>

      <div className="card">
        <h2>Données collectées</h2>
        <ul>
          <li>
            <strong>À l'inscription</strong> : adresse e-mail, pseudo, mot de passe (stocké sous forme hachée,
            jamais en clair).
          </li>
          <li>
            <strong>Profil (facultatif)</strong> : photo, biographie, numéro de téléphone, sexe, date de naissance,
            taille, poids, objectifs nutritionnels, couleur d'accent choisie.
          </li>
          <li>
            <strong>Contenu créé</strong> : recettes, ingrédients, étapes, commentaires, recettes aimées ou
            enregistrées, historique des recettes cuisinées.
          </li>
          <li>
            <strong>Réinitialisation de mot de passe</strong> : un jeton temporaire à usage unique (valable 1 heure),
            dont seule une empreinte est conservée en base.
          </li>
        </ul>
      </div>

      <div className="card">
        <h2>Finalités</h2>
        <p>
          Ces données servent uniquement au fonctionnement de l'application : création de compte et connexion,
          calcul personnalisé des macronutriments, affichage du fil de recettes et des profils, modération du
          contenu signalé. Aucune donnée n'est utilisée à des fins publicitaires ni revendue à des tiers.
        </p>
      </div>

      <div className="card">
        <h2>Destinataires des données</h2>
        <p>
          Les données transitent uniquement par les prestataires techniques nécessaires au fonctionnement du
          service : hébergement (Vercel, Render, Neon — voir les{' '}
          <a href="/mentions-legales">mentions légales</a>) et, lorsqu'il est configuré, l'envoi d'e-mails de
          réinitialisation de mot de passe via Resend. Aucun autre tiers n'y a accès.
        </p>
      </div>

      <div className="card">
        <h2>Conservation</h2>
        <p>
          Les données sont conservées tant que le compte existe. Vous pouvez demander la suppression de votre compte
          et de vos données à tout moment en écrivant à l'adresse de contact ci-dessus.
        </p>
      </div>

      <div className="card">
        <h2>Vos droits</h2>
        <p>
          Conformément au RGPD, vous disposez d'un droit d'accès, de rectification, d'effacement et de portabilité
          de vos données. Pour exercer ces droits, contactez{' '}
          <a href="mailto:timothebeucher@gmail.com">timothebeucher@gmail.com</a>. Vous pouvez également introduire
          une réclamation auprès de la CNIL (cnil.fr).
        </p>
      </div>

      <div className="card">
        <h2>Sécurité</h2>
        <p>
          Les mots de passe sont chiffrés (hachage bcrypt) et ne sont jamais stockés en clair. Les liens de
          réinitialisation de mot de passe sont à usage unique, expirent après une heure, et seule leur empreinte
          cryptographique est conservée en base — jamais le lien lui-même.
        </p>
      </div>

      <div className="card">
        <h2>Cookies et traceurs</h2>
        <p>
          L'application n'utilise aucun cookie de suivi ni traceur publicitaire. La connexion est maintenue via un
          jeton stocké localement dans votre navigateur (localStorage), qui n'est transmis qu'au serveur de
          l'application.
        </p>
      </div>
    </div>
  );
}

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// Enveloppe légère autour de l'API REST Resend (pas de SDK, un simple POST
// suffit). Si RESEND_API_KEY n'est pas configuré (dev local, ou en attendant
// qu'un nom de domaine soit vérifié en prod), on journalise et on continue
// sans lever d'erreur : le reste du flux (génération du token, etc.) doit
// rester utilisable même sans envoi d'e-mail réel.
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly config: ConfigService) {}

  async send(to: string, subject: string, html: string): Promise<void> {
    const apiKey = this.config.get<string>('RESEND_API_KEY');
    const from = this.config.get<string>('MAIL_FROM') || 'onboarding@resend.dev';

    if (!apiKey) {
      // Pas de service configuré : on journalise le contenu complet (utile
      // en dev pour récupérer un lien de réinitialisation sans vraie boîte
      // mail) plutôt que d'échouer silencieusement.
      this.logger.warn(`RESEND_API_KEY non configuré — e-mail non envoyé.\nÀ : ${to}\nSujet : ${subject}\n${html}`);
      return;
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to, subject, html }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      this.logger.error(`Échec de l'envoi de l'e-mail à ${to} : ${res.status} ${body}`);
    }
  }
}

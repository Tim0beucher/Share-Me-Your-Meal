import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface MatchCandidate {
  id: string;
  name: string;
}

// Choisit, parmi une liste réelle d'aliments de la base CIQUAL, celui qui
// correspond le mieux à une description libre ("poulet cru", "riz cru"...).
// Claude ne calcule ni n'invente jamais de valeur nutritionnelle : il ne fait
// que pointer vers une entrée existante, les macros restent 100% CIQUAL.
// Sans ANTHROPIC_API_KEY configurée, on se rabat sur le meilleur candidat
// déjà trié par similarité (comportement précédent, jamais bloquant).
@Injectable()
export class IngredientMatcherService {
  private readonly logger = new Logger(IngredientMatcherService.name);

  constructor(private readonly config: ConfigService) {}

  async pickBestMatch(query: string, candidates: MatchCandidate[]): Promise<string | null> {
    if (candidates.length === 0) return null;

    const apiKey = this.config.get<string>('ANTHROPIC_API_KEY');
    if (!apiKey) return candidates[0].id;

    const model = this.config.get<string>('ANTHROPIC_MODEL') || 'claude-haiku-4-5-20251001';
    const list = candidates.map((c, i) => `${i + 1}. ${c.name}`).join('\n');
    const prompt =
      `Un utilisateur décrit un ingrédient de recette ainsi : "${query}"\n\n` +
      `Voici des aliments réels d'une base nutritionnelle (CIQUAL), numérotés :\n${list}\n\n` +
      `Réponds uniquement avec le numéro de l'aliment qui correspond le mieux à cette description ` +
      `(en général l'aliment le plus courant/générique si la description est vague), ou "0" si aucun ` +
      `ne correspond raisonnablement. Réponds avec un nombre seul, sans aucun autre texte.`;

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model,
          max_tokens: 8,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (!res.ok) {
        const body = await res.text().catch(() => '');
        this.logger.warn(`Échec de l'appel à Claude (${res.status}) : ${body} — repli sur la similarité.`);
        return candidates[0].id;
      }

      const data = (await res.json()) as { content?: { text?: string }[] };
      const text = data.content?.[0]?.text ?? '';
      const match = text.match(/\d+/);
      const index = match ? parseInt(match[0], 10) : 0;

      if (index >= 1 && index <= candidates.length) return candidates[index - 1].id;
      if (index === 0) return null; // Claude estime qu'aucun candidat ne convient
      return candidates[0].id;
    } catch (err) {
      this.logger.warn(`Erreur lors de l'appel à Claude — repli sur la similarité : ${err}`);
      return candidates[0].id;
    }
  }
}

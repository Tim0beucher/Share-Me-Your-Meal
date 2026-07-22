import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Kysely, sql } from 'kysely';
import { KYSELY } from '../db/database.module';
import { Database } from '../db/types';
import { resolveIngredients } from '../recipes/macro-calculator';
import { parseIngredientText } from './ingredient-text-parser';
import { IngredientMatcherService } from './ingredient-matcher.service';

const NUTRITION_COLUMNS = [
  'id',
  'name',
  'brand',
  'state',
  'calories_kcal_per_100g',
  'protein_g_per_100g',
  'carbs_g_per_100g',
  'fat_g_per_100g',
] as const;

const round = (n: number) => Math.round(n * 100) / 100;

// Termes qui, sur la seule similarité de texte, matchent aussi bien qu'un
// ingrédient "normal" pour une recherche générique (ex. "poulet cru" trouve
// aussi bien "Foie, poulet, cru" que "Poulet, pilon, cru" — les deux
// contiennent "poulet" et "cru" ; "fromage blanc" trouve aussi bien "Gâteau
// au fromage blanc"). Sans connaissance du sens, rien ne distingue un abat
// ou un plat préparé d'un ingrédient brut — on les dépriorise donc sauf si
// l'utilisateur les demande explicitement (le terme apparaît alors aussi
// dans sa recherche, et la pénalité ne s'applique pas).
const DEPRIORITIZED_TERMS = [
  // Abats
  'foie',
  'coeur',
  'cœur',
  'gésier',
  'rognon',
  'tripe',
  'abats',
  'cervelle',
  'langue',
  'museau',
  'oreille',
  'couenne',
  'boyau',
  // Plats préparés (contiennent souvent l'ingrédient recherché sans en être un)
  'gâteau',
  'gateau',
  'tarte',
  'quiche',
  'salade',
  'sandwich',
  'pizza',
  'soupe',
  'crêpe',
  'crepe',
  'pâté',
  'pate',
  'gratin',
  'tourte',
  'feuilleté',
  'beignet',
];

@Injectable()
export class FoodsService {
  constructor(
    @Inject(KYSELY) private readonly db: Kysely<Database>,
    private readonly matcher: IngredientMatcherService,
  ) {}

  search(query: string, limit = 20) {
    return this.db.selectFrom('foods').select(NUTRITION_COLUMNS).where('name', 'ilike', `%${query}%`).orderBy('name').limit(limit).execute();
  }

  // Suggère des aliments "cuits" proches d'un aliment "cru" donné, par
  // similarité de nom (pg_trgm) au sein de la même catégorie CIQUAL. CIQUAL
  // ne relie pas explicitement une entrée crue à ses équivalents cuits (ce
  // sont des lignes indépendantes, ex. "Poulet, viande et peau, cru" vs
  // "Poulet, viande et peau, rôti/cuit au four") : la similarité textuelle
  // est une heuristique, pas un lien garanti — d'où le seuil et la limite.
  async cookedEquivalents(foodId: string, limit = 5) {
    const source = await this.db
      .selectFrom('foods')
      .select(['name', 'state', 'category_id'])
      .where('id', '=', foodId)
      .executeTakeFirst();
    if (!source) throw new NotFoundException('Aliment introuvable.');
    if (source.state !== 'cru') return [];

    return this.db
      .selectFrom('foods')
      .select(NUTRITION_COLUMNS)
      .where('id', '!=', foodId)
      .where('state', '=', 'cuit')
      .where('category_id', '=', source.category_id)
      .where(sql<boolean>`similarity(name, ${source.name}) > 0.3`)
      .orderBy(sql`similarity(name, ${source.name})`, 'desc')
      .limit(limit)
      .execute();
  }

  // Transforme un texte libre ("200g de poulet cru, 150g de riz cru et 250g
  // de haricots verts") en une liste d'ingrédients prêts à être ajoutés à une
  // recette. Chaque segment est réduit à une short-list de candidats réels,
  // classés par un score combinant la similarité de nom (pg_trgm) et un bonus
  // par mot de la recherche retrouvé tel quel dans le nom (ex. "poulet" et
  // "cru" tous deux présents) — la seule similarité de caractères a tendance
  // à préférer des aliments proches par la forme mais sans rapport par le
  // sens (ex. "Foie, poulet, cru" pour la recherche "poulet cru"). Claude
  // peut ensuite affiner ce choix parmi les candidats si une clé API est
  // configurée (voir IngredientMatcherService) ; sans clé, le premier
  // candidat du classement est retenu. La quantité est convertie en grammes
  // via les mêmes équivalences d'unité qu'une recette classique.
  async parseIngredients(text: string) {
    const segments = parseIngredientText(text);

    const results = [];
    for (const segment of segments) {
      const scoreExpr = sql<number>`
        similarity(name, ${segment.name})
        + (
            select count(*)::float
            from unnest(string_to_array(lower(${segment.name}), ' ')) as w(word)
            where length(w.word) > 2 and position(w.word in lower(name)) > 0
          ) * 0.15
        - (
            select count(*)::float
            from unnest(${DEPRIORITIZED_TERMS}::text[]) as o(word)
            where position(o.word in lower(name)) > 0
              and position(o.word in lower(${segment.name})) = 0
          ) * 0.5
      `;

      const candidates = await this.db
        .selectFrom('foods')
        .select([...NUTRITION_COLUMNS, scoreExpr.as('score')])
        .where(sql<boolean>`similarity(name, ${segment.name}) > 0.12`)
        .orderBy(scoreExpr, 'desc')
        .orderBy(sql`length(name)`, 'asc')
        .orderBy('id', 'asc')
        .limit(12)
        .execute();

      const bestId = await this.matcher.pickBestMatch(
        segment.name,
        candidates.map((c) => ({ id: c.id, name: c.name })),
      );
      const best = bestId ? (candidates.find((c) => c.id === bestId) ?? null) : null;
      const alternatives = candidates.filter((c) => c.id !== bestId).slice(0, 3);

      let grams = round(segment.quantity);

      if (best && segment.unit !== 'gramme') {
        try {
          const [resolved] = await resolveIngredients(this.db, [
            { foodId: best.id, quantity: segment.quantity, unit: segment.unit },
          ]);
          grams = round(resolved.grams);
        } catch {
          // Pas d'équivalence connue pour cette unité avec cet aliment :
          // on garde la quantité brute (traitée comme des grammes), à
          // corriger manuellement si besoin plutôt que de faire échouer
          // tout le texte pour une seule ligne.
        }
      }

      results.push({
        raw: segment.raw,
        quantity: grams,
        quantityGuessed: segment.quantityGuessed,
        matched: best
          ? {
              id: best.id,
              name: best.name,
              brand: best.brand,
              state: best.state,
              calories_kcal_per_100g: best.calories_kcal_per_100g,
              protein_g_per_100g: best.protein_g_per_100g,
              carbs_g_per_100g: best.carbs_g_per_100g,
              fat_g_per_100g: best.fat_g_per_100g,
            }
          : null,
        alternatives: alternatives.map((a) => ({
          id: a.id,
          name: a.name,
          brand: a.brand,
          state: a.state,
          calories_kcal_per_100g: a.calories_kcal_per_100g,
          protein_g_per_100g: a.protein_g_per_100g,
          carbs_g_per_100g: a.carbs_g_per_100g,
          fat_g_per_100g: a.fat_g_per_100g,
        })),
      });
    }

    return results;
  }
}

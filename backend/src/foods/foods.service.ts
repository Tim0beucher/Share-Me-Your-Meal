import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Kysely, sql } from 'kysely';
import { KYSELY } from '../db/database.module';
import { Database } from '../db/types';
import { resolveIngredients } from '../recipes/macro-calculator';
import { parseIngredientText } from './ingredient-text-parser';

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

@Injectable()
export class FoodsService {
  constructor(@Inject(KYSELY) private readonly db: Kysely<Database>) {}

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
  // recette : chaque segment est mis en correspondance avec l'aliment le
  // plus proche par similarité de nom (pg_trgm), et sa quantité convertie en
  // grammes via les mêmes équivalences d'unité qu'une recette classique.
  async parseIngredients(text: string) {
    const segments = parseIngredientText(text);

    const results = [];
    for (const segment of segments) {
      const candidates = await this.db
        .selectFrom('foods')
        .select([...NUTRITION_COLUMNS, sql<number>`similarity(name, ${segment.name})`.as('score')])
        .where(sql<boolean>`similarity(name, ${segment.name}) > 0.15`)
        .orderBy(sql`similarity(name, ${segment.name})`, 'desc')
        .limit(4)
        .execute();

      const [best, ...alternatives] = candidates;
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

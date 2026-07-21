import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Kysely, sql } from 'kysely';
import { KYSELY } from '../db/database.module';
import { Database } from '../db/types';

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
}

import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Kysely, sql } from 'kysely';
import { KYSELY } from '../db/database.module';
import { Database } from '../db/types';
import { TimeseriesPeriod } from './dto/timeseries-query.dto';
import { ReportsService } from '../reports/reports.service';

// Whitelist stricte : metric est validé par TimeseriesQueryDto (@IsIn) avant
// d'arriver ici, donc interpoler ces valeurs de config (jamais l'entrée
// utilisateur brute) dans du SQL brut via sql.raw est sûr.
const TIMESERIES_CONFIG = {
  users: { table: 'users', dateColumn: 'created_at', filterDeleted: false },
  recipes: { table: 'recipes', dateColumn: 'created_at', filterDeleted: true },
  comments: { table: 'comments', dateColumn: 'created_at', filterDeleted: true },
  reports: { table: 'reports', dateColumn: 'created_at', filterDeleted: false },
} as const;

type Granularity = 'hour' | 'day' | 'week' | 'month';

// Correspondance période choisie -> granularité des points + nombre de
// points affichés. "all" est un cas particulier : le nombre de points dépend
// de l'ancienneté des données, résolu dynamiquement dans timeseries().
const FIXED_PERIODS: Record<Exclude<TimeseriesPeriod, 'all'>, { granularity: Granularity; count: number }> = {
  '24h': { granularity: 'hour', count: 24 },
  '7d': { granularity: 'day', count: 7 },
  '14d': { granularity: 'day', count: 14 },
  '1m': { granularity: 'day', count: 30 },
  '3m': { granularity: 'week', count: 13 },
  '6m': { granularity: 'week', count: 26 },
  '1y': { granularity: 'month', count: 12 },
};

const ALL_TIME_MAX_MONTHS = 120; // 10 ans, garde-fou plutôt qu'une vraie limite métier

@Injectable()
export class AdminService {
  constructor(
    @Inject(KYSELY) private readonly db: Kysely<Database>,
    private readonly reports: ReportsService,
  ) {}

  async stats() {
    const [users, recipes, comments, pendingReports] = await Promise.all([
      this.db.selectFrom('users').select(({ fn }) => fn.countAll().as('count')).executeTakeFirstOrThrow(),
      this.db.selectFrom('recipes').select(({ fn }) => fn.countAll().as('count')).where('deleted_at', 'is', null).executeTakeFirstOrThrow(),
      this.db.selectFrom('comments').select(({ fn }) => fn.countAll().as('count')).where('deleted_at', 'is', null).executeTakeFirstOrThrow(),
      this.db
        .selectFrom('reports')
        .select(({ fn }) => fn.countAll().as('count'))
        .where('status', '=', 'en_attente')
        .executeTakeFirstOrThrow(),
    ]);
    return {
      users: Number(users.count),
      recipes: Number(recipes.count),
      comments: Number(comments.count),
      pendingReports: Number(pendingReports.count),
    };
  }

  // Série temporelle de créations (nouveaux utilisateurs/recettes/commentaires
  // par heure, jour, semaine ou mois selon la période choisie), pour les
  // graphiques en courbe du dashboard.
  async timeseries(metric: 'users' | 'recipes' | 'comments' | 'reports', period: TimeseriesPeriod) {
    const config = TIMESERIES_CONFIG[metric];
    const { granularity, count } = await this.resolvePeriod(config, period);
    const step = sql<string>`(1 || ' ' || ${granularity})::interval`;
    const deletedFilter = config.filterDeleted ? sql`AND t.deleted_at IS NULL` : sql``;

    const rows = await sql<{ bucket_start: Date; count: string }>`
      WITH buckets AS (
        SELECT generate_series(
          date_trunc(${granularity}, now()) - (${count - 1}) * ${step},
          date_trunc(${granularity}, now()),
          ${step}
        ) AS bucket_start
      )
      SELECT b.bucket_start, COUNT(t.id)::int AS count
      FROM buckets b
      LEFT JOIN ${sql.raw(config.table)} t
        ON date_trunc(${granularity}, t.${sql.raw(config.dateColumn)}) = b.bucket_start
        ${deletedFilter}
      GROUP BY b.bucket_start
      ORDER BY b.bucket_start
    `.execute(this.db);

    return rows.rows.map((r) => ({ date: r.bucket_start, count: Number(r.count) }));
  }

  private async resolvePeriod(
    config: (typeof TIMESERIES_CONFIG)[keyof typeof TIMESERIES_CONFIG],
    period: TimeseriesPeriod,
  ): Promise<{ granularity: Granularity; count: number }> {
    if (period !== 'all') return FIXED_PERIODS[period];

    const oldest = await sql<{ min_date: Date | null }>`
      SELECT MIN(${sql.raw(config.dateColumn)}) AS min_date FROM ${sql.raw(config.table)}
    `.execute(this.db);

    const minDate = oldest.rows[0]?.min_date;
    if (!minDate) return { granularity: 'month', count: 1 };

    const months = Math.floor((Date.now() - new Date(minDate).getTime()) / (1000 * 60 * 60 * 24 * 30)) + 1;
    return { granularity: 'month', count: Math.min(Math.max(months, 1), ALL_TIME_MAX_MONTHS) };
  }

  listReports() {
    return this.reports.listAll();
  }

  resolveReport(id: string, adminId: string, status: 'traite' | 'rejete', resolutionNote?: string) {
    return this.reports.resolve(id, adminId, status, resolutionNote);
  }

  async hideComment(id: string) {
    const result = await this.db
      .updateTable('comments')
      .set({ is_hidden: true })
      .where('id', '=', id)
      .returning('id')
      .executeTakeFirst();
    if (!result) throw new NotFoundException('Commentaire introuvable.');
    return { hidden: true };
  }

  listUsers() {
    return this.db
      .selectFrom('users')
      .select(['id', 'pseudo', 'email', 'role', 'created_at', 'deleted_at'])
      .orderBy('created_at', 'desc')
      .execute();
  }

  async setUserBanned(id: string, banned: boolean) {
    const result = await this.db
      .updateTable('users')
      .set({ deleted_at: banned ? new Date() : null })
      .where('id', '=', id)
      .returning('id')
      .executeTakeFirst();
    if (!result) throw new NotFoundException('Utilisateur introuvable.');
    return { banned };
  }
}

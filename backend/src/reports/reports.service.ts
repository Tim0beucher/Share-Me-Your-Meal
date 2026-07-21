import { Inject, Injectable } from '@nestjs/common';
import { Kysely } from 'kysely';
import { KYSELY } from '../db/database.module';
import { Database } from '../db/types';
import { CreateReportDto } from './dto/create-report.dto';

@Injectable()
export class ReportsService {
  constructor(@Inject(KYSELY) private readonly db: Kysely<Database>) {}

  create(reporterId: string, dto: CreateReportDto) {
    return this.db
      .insertInto('reports')
      .values({ reporter_id: reporterId, target_type: dto.targetType, target_id: dto.targetId, reason: dto.reason })
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  // Vue admin : la cible est polymorphe (recette/commentaire/aliment/
  // utilisateur), donc on enrichit après coup plutôt que par une jointure
  // unique — volume attendu faible (file de modération), le N+1 est
  // largement suffisant ici.
  async listAll() {
    const reports = await this.db
      .selectFrom('reports')
      .innerJoin('users', 'users.id', 'reports.reporter_id')
      .select([
        'reports.id',
        'reports.target_type',
        'reports.target_id',
        'reports.reason',
        'reports.status',
        'reports.resolution_note',
        'reports.created_at',
        'users.pseudo as reporter_pseudo',
      ])
      .orderBy('reports.status', 'asc') // en_attente d'abord (ordre alpha : en_attente < rejete < traite)
      .orderBy('reports.created_at', 'desc')
      .execute();

    const commentIds = reports.filter((r) => r.target_type === 'commentaire').map((r) => r.target_id);
    const comments = commentIds.length
      ? await this.db.selectFrom('comments').select(['id', 'content']).where('id', 'in', commentIds).execute()
      : [];
    const commentById = new Map(comments.map((c) => [c.id, c.content]));

    return reports.map((r) => ({
      ...r,
      targetPreview: r.target_type === 'commentaire' ? (commentById.get(r.target_id) ?? null) : null,
    }));
  }

  async resolve(id: string, adminId: string, status: 'traite' | 'rejete', resolutionNote?: string) {
    return this.db
      .updateTable('reports')
      .set({ status, resolved_by: adminId, resolved_at: new Date(), resolution_note: resolutionNote ?? null })
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirstOrThrow();
  }
}

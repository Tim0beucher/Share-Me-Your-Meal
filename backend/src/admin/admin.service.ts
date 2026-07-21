import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Kysely } from 'kysely';
import { KYSELY } from '../db/database.module';
import { Database } from '../db/types';
import { ReportsService } from '../reports/reports.service';

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

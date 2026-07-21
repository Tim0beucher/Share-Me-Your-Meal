import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Kysely } from 'kysely';
import { KYSELY } from '../db/database.module';
import { Database } from '../db/types';
import { CreateCommentDto } from './dto/create-comment.dto';

@Injectable()
export class CommentsService {
  constructor(@Inject(KYSELY) private readonly db: Kysely<Database>) {}

  list(recipeId: string) {
    return this.db
      .selectFrom('comments')
      .innerJoin('users', 'users.id', 'comments.user_id')
      .select([
        'comments.id',
        'comments.content',
        'comments.parent_comment_id',
        'comments.created_at',
        'comments.user_id',
        'users.pseudo as author_pseudo',
      ])
      .where('comments.recipe_id', '=', recipeId)
      .where('comments.deleted_at', 'is', null)
      .where('comments.is_hidden', '=', false)
      .orderBy('comments.created_at', 'asc')
      .execute();
  }

  async create(userId: string, recipeId: string, dto: CreateCommentDto) {
    const recipe = await this.db.selectFrom('recipes').select('id').where('id', '=', recipeId).executeTakeFirst();
    if (!recipe) throw new NotFoundException('Recette introuvable.');

    if (dto.parentCommentId) {
      const parent = await this.db
        .selectFrom('comments')
        .select('recipe_id')
        .where('id', '=', dto.parentCommentId)
        .executeTakeFirst();
      if (!parent || parent.recipe_id !== recipeId) {
        throw new NotFoundException('Commentaire parent introuvable sur cette recette.');
      }
    }

    return this.db
      .insertInto('comments')
      .values({
        recipe_id: recipeId,
        user_id: userId,
        parent_comment_id: dto.parentCommentId ?? null,
        content: dto.content,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  async remove(userId: string, commentId: string) {
    const comment = await this.db
      .selectFrom('comments')
      .select(['user_id'])
      .where('id', '=', commentId)
      .executeTakeFirst();
    if (!comment) throw new NotFoundException('Commentaire introuvable.');
    if (comment.user_id !== userId) throw new ForbiddenException("Ce commentaire ne vous appartient pas.");

    await this.db.updateTable('comments').set({ deleted_at: new Date() }).where('id', '=', commentId).execute();
    return { deleted: true };
  }
}

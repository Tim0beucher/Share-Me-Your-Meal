import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';

@Controller()
export class CommentsController {
  constructor(private readonly comments: CommentsService) {}

  @Get('recipes/:recipeId/comments')
  list(@Param('recipeId') recipeId: string) {
    return this.comments.list(recipeId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('recipes/:recipeId/comments')
  create(@CurrentUser() userId: string, @Param('recipeId') recipeId: string, @Body() dto: CreateCommentDto) {
    return this.comments.create(userId, recipeId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('comments/:id')
  remove(@CurrentUser() userId: string, @Param('id') id: string) {
    return this.comments.remove(userId, id);
  }
}

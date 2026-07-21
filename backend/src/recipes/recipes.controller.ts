import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdaptRecipeDto } from './dto/adapt-recipe.dto';
import { CreateRecipeDto } from './dto/create-recipe.dto';
import { RecipesService } from './recipes.service';

@Controller('recipes')
export class RecipesController {
  constructor(private readonly recipes: RecipesService) {}

  @Get()
  listFeed(@Query('limit') limit?: string) {
    return this.recipes.listFeed(limit ? Number(limit) : undefined);
  }

  @Get(':id')
  getRecipe(@Param('id') id: string) {
    return this.recipes.getRecipe(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  createRecipe(@CurrentUser() userId: string, @Body() dto: CreateRecipeDto) {
    return this.recipes.createRecipe(userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/adapt')
  adaptRecipe(@CurrentUser() userId: string, @Param('id') id: string, @Body() dto: AdaptRecipeDto) {
    return this.recipes.adaptRecipe(userId, id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/like')
  like(@CurrentUser() userId: string, @Param('id') id: string) {
    return this.recipes.like(userId, id);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id/like')
  unlike(@CurrentUser() userId: string, @Param('id') id: string) {
    return this.recipes.unlike(userId, id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/save')
  save(@CurrentUser() userId: string, @Param('id') id: string) {
    return this.recipes.save(userId, id);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id/save')
  unsave(@CurrentUser() userId: string, @Param('id') id: string) {
    return this.recipes.unsave(userId, id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/cook-events')
  markCooked(@CurrentUser() userId: string, @Param('id') id: string) {
    return this.recipes.markCooked(userId, id);
  }
}

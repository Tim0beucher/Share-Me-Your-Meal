import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ActivityQueryDto } from './dto/activity-query.dto';
import { CreateCollectionDto } from './dto/create-collection.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { MeService } from './me.service';

@UseGuards(JwtAuthGuard)
@Controller('me')
export class MeController {
  constructor(private readonly me: MeService) {}

  @Get()
  getProfile(@CurrentUser() userId: string) {
    return this.me.getProfile(userId);
  }

  @Patch()
  updateProfile(@CurrentUser() userId: string, @Body() dto: UpdateProfileDto) {
    return this.me.updateProfile(userId, dto);
  }

  @Get('recipes')
  myRecipes(@CurrentUser() userId: string) {
    return this.me.myRecipes(userId);
  }

  @Get('liked-recipes')
  likedRecipes(@CurrentUser() userId: string) {
    return this.me.likedRecipes(userId);
  }

  @Get('saved-recipes')
  savedRecipes(@CurrentUser() userId: string) {
    return this.me.savedRecipes(userId);
  }

  @Get('collections')
  collections(@CurrentUser() userId: string) {
    return this.me.collections(userId);
  }

  @Post('collections')
  createCollection(@CurrentUser() userId: string, @Body() dto: CreateCollectionDto) {
    return this.me.createCollection(userId, dto.name);
  }

  @Get('collections/:id/recipes')
  collectionRecipes(@CurrentUser() userId: string, @Param('id') id: string) {
    return this.me.collectionRecipes(userId, id);
  }

  @Post('collections/:id/recipes/:recipeId')
  addRecipeToCollection(@CurrentUser() userId: string, @Param('id') id: string, @Param('recipeId') recipeId: string) {
    return this.me.addRecipeToCollection(userId, id, recipeId);
  }

  @Delete('collections/:id/recipes/:recipeId')
  removeRecipeFromCollection(@CurrentUser() userId: string, @Param('id') id: string, @Param('recipeId') recipeId: string) {
    return this.me.removeRecipeFromCollection(userId, id, recipeId);
  }

  @Get('activity')
  activity(@CurrentUser() userId: string, @Query() query: ActivityQueryDto) {
    return this.me.activity(userId, query);
  }
}

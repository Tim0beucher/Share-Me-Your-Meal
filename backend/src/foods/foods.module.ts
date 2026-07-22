import { Module } from '@nestjs/common';
import { FoodsController } from './foods.controller';
import { FoodsService } from './foods.service';
import { IngredientMatcherService } from './ingredient-matcher.service';

@Module({
  controllers: [FoodsController],
  providers: [FoodsService, IngredientMatcherService],
  exports: [FoodsService],
})
export class FoodsModule {}

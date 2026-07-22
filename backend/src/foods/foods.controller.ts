import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ParseIngredientsDto } from './dto/parse-ingredients.dto';
import { FoodsService } from './foods.service';

@Controller('foods')
export class FoodsController {
  constructor(private readonly foods: FoodsService) {}

  @Get()
  search(@Query('search') search = '') {
    return this.foods.search(search.trim());
  }

  @Get(':id/cooked-equivalents')
  cookedEquivalents(@Param('id') id: string) {
    return this.foods.cookedEquivalents(id);
  }

  @Post('parse-ingredients')
  parseIngredients(@Body() dto: ParseIngredientsDto) {
    return this.foods.parseIngredients(dto.text);
  }
}

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { DatabaseModule } from './db/database.module';
import { FoodsModule } from './foods/foods.module';
import { MeModule } from './me/me.module';
import { RecipesModule } from './recipes/recipes.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    AuthModule,
    FoodsModule,
    RecipesModule,
    MeModule,
  ],
})
export class AppModule {}

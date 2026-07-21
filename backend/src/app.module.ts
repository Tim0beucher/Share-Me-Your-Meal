import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AdminModule } from './admin/admin.module';
import { AuthModule } from './auth/auth.module';
import { CommentsModule } from './comments/comments.module';
import { DatabaseModule } from './db/database.module';
import { FoodsModule } from './foods/foods.module';
import { MeModule } from './me/me.module';
import { RecipesModule } from './recipes/recipes.module';
import { ReportsModule } from './reports/reports.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    AuthModule,
    FoodsModule,
    RecipesModule,
    MeModule,
    CommentsModule,
    ReportsModule,
    AdminModule,
  ],
})
export class AppModule {}

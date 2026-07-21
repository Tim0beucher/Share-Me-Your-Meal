import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kysely, PostgresDialect } from 'kysely';
import { Pool, types } from 'pg';
import { Database } from './types';

// Par défaut node-pg renvoie les colonnes NUMERIC sous forme de string
// (pour éviter toute perte de précision) : on les reconvertit en number,
// les montants manipulés ici (grammes, kcal, g de macros) n'ont pas besoin
// d'une précision arbitraire et le calcul de macros est plus simple ainsi.
types.setTypeParser(1700, (value) => parseFloat(value));

// DATE (birth_date, entry_date...) est par défaut parsée par node-pg en
// objet Date à minuit *heure locale du serveur*, puis resérialisée en JSON
// via toISOString() en UTC : sur un serveur dans un fuseau en avance sur
// UTC (ex. Europe/Paris), ça décale la date d'un jour en arrière une fois
// renvoyée au client. Comme DATE n'a pas de composante horaire, on la
// garde en texte brut ("1995-04-12") et on laisse le typage TS (string)
// refléter ce choix — aucune conversion de fuseau à faire côté serveur.
types.setTypeParser(1082, (value) => value);

export const KYSELY = 'KYSELY_CONNECTION';

@Global()
@Module({
  providers: [
    {
      provide: KYSELY,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new Kysely<Database>({
          dialect: new PostgresDialect({
            pool: new Pool({ connectionString: config.getOrThrow<string>('DATABASE_URL') }),
          }),
        }),
    },
  ],
  exports: [KYSELY],
})
export class DatabaseModule {}

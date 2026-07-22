import { IsIn } from 'class-validator';

export const TIMESERIES_PERIODS = ['24h', '7d', '14d', '1m', '3m', '6m', '1y', 'all'] as const;
export type TimeseriesPeriod = (typeof TIMESERIES_PERIODS)[number];

export class TimeseriesQueryDto {
  @IsIn(['users', 'recipes', 'comments', 'reports'])
  metric!: 'users' | 'recipes' | 'comments' | 'reports';

  @IsIn(TIMESERIES_PERIODS)
  period!: TimeseriesPeriod;
}

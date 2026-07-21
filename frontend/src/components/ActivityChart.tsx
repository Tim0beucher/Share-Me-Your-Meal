import { ActivityBucket } from '../api/types';

const DAY_FORMAT = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit' });
const MONTH_FORMAT = new Intl.DateTimeFormat('fr-FR', { month: 'short' });

function labelFor(dateStr: string, granularity: 'day' | 'week' | 'month') {
  const date = new Date(dateStr);
  if (granularity === 'month') return MONTH_FORMAT.format(date);
  return DAY_FORMAT.format(date);
}

export function ActivityChart({ buckets, granularity }: { buckets: ActivityBucket[]; granularity: 'day' | 'week' | 'month' }) {
  const max = Math.max(1, ...buckets.map((b) => b.count));
  const width = 700;
  const height = 180;
  const padding = { top: 10, bottom: 28, left: 10, right: 10 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const barGap = 6;
  const barWidth = buckets.length > 0 ? plotWidth / buckets.length - barGap : 0;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', display: 'block' }} role="img" aria-label="Recettes cuisinées dans le temps">
      {buckets.map((b, i) => {
        const barHeight = (b.count / max) * plotHeight;
        const x = padding.left + i * (barWidth + barGap);
        const y = padding.top + (plotHeight - barHeight);
        return (
          <g key={b.date}>
            <rect
              x={x}
              y={y}
              width={Math.max(barWidth, 1)}
              height={Math.max(barHeight, b.count > 0 ? 3 : 0)}
              rx={3}
              fill={b.count > 0 ? 'var(--color-primary)' : 'var(--color-border)'}
            />
            {b.count > 0 && (
              <text x={x + barWidth / 2} y={y - 4} textAnchor="middle" fontSize="11" fill="var(--color-text)">
                {b.count}
              </text>
            )}
            <text
              x={x + barWidth / 2}
              y={height - padding.bottom + 16}
              textAnchor="middle"
              fontSize="10"
              fill="var(--color-text-muted)"
            >
              {labelFor(b.date, granularity)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

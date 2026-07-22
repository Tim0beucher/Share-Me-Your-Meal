export interface LineChartPoint {
  date: string;
  count: number;
}

type Granularity = 'hour' | 'day' | 'week' | 'month';

const HOUR_FORMAT = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' });
const DAY_FORMAT = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit' });
const MONTH_FORMAT = new Intl.DateTimeFormat('fr-FR', { month: 'short', year: '2-digit' });

function formatLabel(dateStr: string, granularity: Granularity) {
  const date = new Date(dateStr);
  if (granularity === 'hour') return HOUR_FORMAT.format(date);
  if (granularity === 'month') return MONTH_FORMAT.format(date);
  return DAY_FORMAT.format(date);
}

// Au-delà d'une poignée de points (ex. "Tout" sur plusieurs années, ou "1
// mois" en quotidien), afficher un libellé par point devient illisible :
// on n'en garde qu'une poignée, répartis régulièrement, plus le dernier.
const MAX_LABELS = 8;

export function LineChart({
  points,
  label,
  granularity = 'day',
}: {
  points: LineChartPoint[];
  label: string;
  granularity?: Granularity;
}) {
  const width = 700;
  const height = 200;
  const padding = { top: 20, bottom: 28, left: 10, right: 10 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  const max = Math.max(1, ...points.map((p) => p.count));
  const stepX = points.length > 1 ? plotWidth / (points.length - 1) : 0;
  const labelStride = Math.max(1, Math.ceil(points.length / MAX_LABELS));

  const coords = points.map((p, i) => ({
    x: padding.left + i * stepX,
    y: padding.top + plotHeight - (p.count / max) * plotHeight,
    ...p,
  }));

  const linePath = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x} ${c.y}`).join(' ');
  const areaPath = `${linePath} L ${coords[coords.length - 1]?.x ?? 0} ${height - padding.bottom} L ${coords[0]?.x ?? 0} ${height - padding.bottom} Z`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      style={{ width: '100%', height: 'auto', display: 'block' }}
      role="img"
      aria-label={label}
    >
      {coords.length > 0 && (
        <>
          <path d={areaPath} fill="var(--color-primary)" opacity={0.12} />
          <path d={linePath} fill="none" stroke="var(--color-primary)" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
        </>
      )}
      {coords.map((c, i) => {
        const showLabel = i % labelStride === 0 || i === coords.length - 1;
        // Ancre le texte selon la position réelle plutôt que l'index, pour
        // qu'un point isolé près d'un bord (ex. "Tout" avec un seul mois de
        // données) ne fasse pas déborder son étiquette hors du graphique.
        const anchor = c.x < 30 ? 'start' : c.x > width - 30 ? 'end' : 'middle';
        return (
          <g key={c.date}>
            <circle cx={c.x} cy={c.y} r={3.5} fill="var(--color-primary)" />
            {(i === 0 || i === coords.length - 1 || c.count === max) && (
              <text x={c.x} y={c.y - 10} textAnchor={anchor} fontSize="11" fill="var(--color-text)">
                {c.count}
              </text>
            )}
            {showLabel && (
              <text x={c.x} y={height - padding.bottom + 16} textAnchor={anchor} fontSize="10" fill="var(--color-text-muted)">
                {formatLabel(c.date, granularity)}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

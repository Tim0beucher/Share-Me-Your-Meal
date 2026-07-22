export interface LineChartPoint {
  date: string;
  count: number;
}

const DAY_FORMAT = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit' });

export function LineChart({ points, label }: { points: LineChartPoint[]; label: string }) {
  const width = 700;
  const height = 200;
  const padding = { top: 20, bottom: 28, left: 10, right: 10 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  const max = Math.max(1, ...points.map((p) => p.count));
  const stepX = points.length > 1 ? plotWidth / (points.length - 1) : 0;

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
      {coords.map((c, i) => (
        <g key={c.date}>
          <circle cx={c.x} cy={c.y} r={3.5} fill="var(--color-primary)" />
          {(i === 0 || i === coords.length - 1 || c.count === max) && (
            <text x={c.x} y={c.y - 10} textAnchor="middle" fontSize="11" fill="var(--color-text)">
              {c.count}
            </text>
          )}
          <text x={c.x} y={height - padding.bottom + 16} textAnchor="middle" fontSize="10" fill="var(--color-text-muted)">
            {DAY_FORMAT.format(new Date(c.date))}
          </text>
        </g>
      ))}
    </svg>
  );
}

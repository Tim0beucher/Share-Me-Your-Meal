export function RingChart({
  value,
  target,
  label,
  unit,
}: {
  value: number;
  target: number | null;
  label: string;
  unit: string;
}) {
  const size = 140;
  const stroke = 12;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const ratio = target && target > 0 ? Math.min(value / target, 1) : 0;
  const offset = circumference * (1 - ratio);
  const overTarget = target !== null && target > 0 && value > target;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${label} : ${value}${unit} sur ${target ?? '?'}${unit}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-surface-2)"
          strokeWidth={stroke}
        />
        {target !== null && target > 0 && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={overTarget ? 'var(--color-down)' : 'var(--color-primary)'}
            strokeWidth={stroke}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            style={{ transition: 'stroke-dashoffset 0.4s ease' }}
          />
        )}
        <text x="50%" y="46%" textAnchor="middle" fontSize="22" fontWeight={700} fill="var(--color-text)">
          {Math.round(value)}
        </text>
        <text x="50%" y="62%" textAnchor="middle" fontSize="11" fill="var(--color-text-muted)">
          {target ? `/ ${target}${unit}` : unit}
        </text>
      </svg>
      <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>{label}</span>
    </div>
  );
}

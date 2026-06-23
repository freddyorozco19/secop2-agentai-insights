interface GaugeViabilidadProps {
  puntaje: number;
  nivel: "ALTA" | "MEDIA" | "BAJA" | "MUY_BAJA";
}

const NIVELES = {
  ALTA: { color: "#10b981", label: "ALTA", desc: "Aplicar directamente" },
  MEDIA: { color: "#f59e0b", label: "MEDIA", desc: "Viable con gestiones previas" },
  BAJA: { color: "#f97316", label: "BAJA", desc: "Considerar consorcio" },
  MUY_BAJA: { color: "#ef4444", label: "MUY BAJA", desc: "No recomendado" },
} as const;

export default function GaugeViabilidad({ puntaje, nivel }: GaugeViabilidadProps) {
  const config = NIVELES[nivel];
  const clamped = Math.max(0, Math.min(100, puntaje));
  const angle = (clamped / 100) * 180;
  const radius = 80;
  const cx = 100;
  const cy = 90;

  const rad = (180 - angle) * (Math.PI / 180);
  const needleX = cx + radius * Math.cos(rad);
  const needleY = cy - radius * Math.sin(rad);

  const arcSegments = [
    { from: 0, to: 39, color: "#ef4444" },
    { from: 40, to: 59, color: "#f97316" },
    { from: 60, to: 79, color: "#f59e0b" },
    { from: 80, to: 100, color: "#10b981" },
  ];

  function arcPath(fromDeg: number, toDeg: number, r: number) {
    const fromRad = (180 - fromDeg) * (Math.PI / 180);
    const toRad = (180 - toDeg) * (Math.PI / 180);
    const x1 = cx + r * Math.cos(fromRad);
    const y1 = cy - r * Math.sin(fromRad);
    const x2 = cx + r * Math.cos(toRad);
    const y2 = cy - r * Math.sin(toRad);
    const largeArc = toDeg - fromDeg > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
  }

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 200 110" className="w-full max-w-[240px]">
        {arcSegments.map((seg, i) => (
          <path
            key={i}
            d={arcPath(seg.from, seg.to, radius)}
            fill="none"
            stroke={seg.color}
            strokeWidth="14"
            strokeLinecap="round"
            opacity={clamped >= seg.from ? 1 : 0.25}
          />
        ))}
        <line
          x1={cx}
          y1={cy}
          x2={needleX}
          y2={needleY}
          stroke={config.color}
          strokeWidth="3"
          strokeLinecap="round"
        />
        <circle cx={cx} cy={cy} r="6" fill={config.color} />
      </svg>
      <div className="-mt-2 flex flex-col items-center">
        <span className="text-4xl font-extrabold text-foreground">
          {clamped}
          <span className="text-lg text-muted">/100</span>
        </span>
        <span
          className="mt-1 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider"
          style={{
            color: config.color,
            background: `${config.color}22`,
            border: `1px solid ${config.color}44`,
          }}
        >
          {config.label}
        </span>
        <span className="mt-1 text-xs text-muted">{config.desc}</span>
      </div>
    </div>
  );
}

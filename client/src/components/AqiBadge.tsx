import { getAqiInfo } from '../utils/aqiUtils';

interface Props {
  aqi: number | null | undefined;
  size?: 'sm' | 'md' | 'lg';
}

const SIZE = {
  sm: { fontSize: '0.75rem', padding: '2px 8px', borderRadius: 4 },
  md: { fontSize: '0.875rem', padding: '4px 12px', borderRadius: 6 },
  lg: { fontSize: '1.25rem', fontWeight: 700, padding: '8px 18px', borderRadius: 10 },
};

export function AqiBadge({ aqi, size = 'md' }: Props) {
  if (aqi === null || aqi === undefined) {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          background: 'rgba(56,189,248,0.12)',
          color: '#38bdf8',
          border: '1px solid rgba(56,189,248,0.3)',
          fontWeight: 600,
          ...SIZE[size],
        }}
        title="Official Indian AQI is not provided by provider; raw pollutant concentrations shown below."
      >
        <span
          style={{
            width: 8, height: 8,
            borderRadius: '50%',
            background: '#38bdf8',
            boxShadow: '0 0 6px #38bdf8',
            display: 'inline-block',
            flexShrink: 0,
          }}
        />
        Raw Pollutants
      </span>
    );
  }

  const info = getAqiInfo(aqi);
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        background: info.bgColor,
        color: info.textColor,
        border: `1px solid ${info.color}44`,
        fontWeight: 600,
        ...SIZE[size],
      }}
    >
      <span
        style={{
          width: 8, height: 8,
          borderRadius: '50%',
          background: info.color,
          boxShadow: `0 0 6px ${info.color}`,
          display: 'inline-block',
          flexShrink: 0,
        }}
      />
      {Math.round(aqi)} — {info.category}
    </span>
  );
}

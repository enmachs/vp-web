interface Props {
  size?: number;
  color?: string;
}

export default function LogoMark({ size = 44, color = 'currentColor' }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 90" aria-hidden="true">
      <path d="M8 10 Q8 3 15 3 L85 3 Q95 3 90 11 L54 82 Q50 89 46 82 L8 14 Z" fill={color} />
      <path d="M46 22 L70 22 L58 40 L46 40 Z" fill="var(--bg, #f4f4f3)" />
    </svg>
  );
}

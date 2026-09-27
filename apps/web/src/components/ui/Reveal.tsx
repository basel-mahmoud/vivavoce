/**
 * Quiet entrance: a small rise and fade tied to the element entering the
 * viewport (CSS scroll-driven animation). Content is visible by default:
 * browsers without view timelines, no-JS, and reduced motion all get the
 * static page. `delay` staggers siblings by starting their range later.
 */
export function Reveal({
  children,
  delay = 0,
  className,
  as = 'div',
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  as?: 'div' | 'li' | 'span';
}) {
  const Tag = as;
  const style = { '--rs': `${Math.round(delay * 100)}%` } as React.CSSProperties;
  return (
    <Tag className={className ? `reveal ${className}` : 'reveal'} style={style}>
      {children}
    </Tag>
  );
}

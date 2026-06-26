import Link from 'next/link';
import { cn } from '@/lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

const base =
  'inline-flex items-center justify-center gap-2 font-medium rounded-full transition-[transform,background-color,border-color,color] duration-200 ease-[var(--ease-standard)] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-ember focus-visible:outline-offset-2 disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap';

const variants: Record<Variant, string> = {
  // The one important action. Dark ink text on ember reads warm and confident.
  primary:
    'bg-ember text-[#16130f] hover:bg-ember-deep hover:text-white shadow-[0_1px_2px_rgba(26,23,20,0.06),0_10px_30px_-12px_rgba(217,128,59,0.5)]',
  secondary:
    'bg-surface text-ink border border-line hover:border-ink/30 hover:bg-surface-2',
  ghost: 'text-ink hover:bg-surface-2',
};

const sizes: Record<Size, string> = {
  sm: 'h-9 px-4 text-sm',
  md: 'h-11 px-5 text-[0.95rem]',
  lg: 'h-13 px-7 text-base',
};

type CommonProps = {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: React.ReactNode;
};

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...rest
}: CommonProps & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={cn(base, variants[variant], sizes[size], className)} {...rest}>
      {children}
    </button>
  );
}

export function ButtonLink({
  variant = 'primary',
  size = 'md',
  className,
  href,
  children,
  ...rest
}: CommonProps & { href: string } & React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  const external = href.startsWith('http');
  const cls = cn(base, variants[variant], sizes[size], className);
  if (external) {
    return (
      <a href={href} className={cls} {...rest}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={cls} {...rest}>
      {children}
    </Link>
  );
}

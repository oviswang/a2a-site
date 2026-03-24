import Link from 'next/link';
import type { ReactNode } from 'react';

export function SafeCardLink({
  href,
  className,
  children,
  style,
  ...rest
}: {
  href: string;
  className?: string;
  children: ReactNode;
  style?: React.CSSProperties;
} & Omit<React.ComponentProps<typeof Link>, 'href' | 'className' | 'children' | 'style'>) {
  return (
    <Link
      href={href}
      className={className}
      // Inline fallback styles (for mobile readers / forced styles): keep spacing + card separation unmistakable.
      style={{
        display: 'block',
        marginBottom: 12,
        padding: 16,
        borderRadius: 14,
        border: '1px solid rgba(255,255,255,0.14)',
        background: 'rgba(15,23,42,0.72)',
        textDecoration: 'none',
        ...style,
      }}
      {...rest}
    >
      {children}
    </Link>
  );
}

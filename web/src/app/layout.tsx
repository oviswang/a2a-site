import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'A2A Site MVP',
  description: 'Static prototype for A2A website',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

import type { Metadata } from 'next';
import { Manrope } from 'next/font/google';
import './globals.css';

const manrope = Manrope({
  variable: '--font-sans',
  subsets: ['latin']
});

export const metadata: Metadata = {
  title: 'Atlas',
  description: 'A collaborative whiteboard and Markdown workspace'
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={manrope.variable}>
      <body>{children}</body>
    </html>
  );
}

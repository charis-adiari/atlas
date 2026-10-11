import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar/Sidebar';
import 'material-symbols/rounded.css';
import type { Metadata } from 'next';
import { DM_Mono, Manrope } from 'next/font/google';
import './globals.css';
import './styles/inputs.css';

const manrope = Manrope({
  variable: '--font-manrope',
  subsets: ['latin']
});

const dmMono = DM_Mono({
  weight: ['400'],
  subsets: ['latin']
});

export const metadata: Metadata = {
  title: 'Atlas',
  description: 'Collaborative Whiteboard & Markdown'
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={`${manrope.variable} ${dmMono}`}>
      <body>
        <Sidebar />
        <main>
          <Header />
          <div className="workspace">{children}</div>
        </main>
      </body>
    </html>
  );
}

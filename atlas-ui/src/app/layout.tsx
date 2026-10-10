import type { Metadata } from 'next';
import { Manrope } from "next/font/google";
import './globals.css';
// import './styles/buttons.css';
import { Header } from '@/components/Header';
import "material-symbols/rounded.css";
import { Sidebar } from '@/components/Sidebar/Sidebar';

const manrope = Manrope({
  variable: '--font-manrope',
  subsets: ['latin']
});

export const metadata: Metadata = {
  title: 'Atlas',
  description: 'Collaborative Whiteboard & Markdown'
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={`${manrope.variable}`}>
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

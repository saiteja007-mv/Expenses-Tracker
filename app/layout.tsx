import './styles/globals.css';
import type { Metadata } from 'next';
import Image from 'next/image';

export const metadata: Metadata = { title: 'Expense Tracker', description: 'Track income & expenses' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="border-b bg-white">
          <div className="container flex items-center gap-3 h-16">
            <Image src="/logo.svg" alt="logo" width={28} height={28} />
            <h1 className="font-semibold">Expense Tracker</h1>
          </div>
        </header>
        <main className="container py-6">{children}</main>
      </body>
    </html>
  );
} 
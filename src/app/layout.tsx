import type { Metadata } from 'next';
import './globals.css';
import { ExpenseProvider } from '@/context/ExpenseContext';
import { Navbar } from '@/components/layout/Navbar';

export const metadata: Metadata = {
  title: 'ExpenseTracker',
  description: 'Track and manage your personal expenses',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans bg-slate-50 text-slate-900 min-h-screen">
        <ExpenseProvider>
          <Navbar />
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </main>
        </ExpenseProvider>
      </body>
    </html>
  );
}

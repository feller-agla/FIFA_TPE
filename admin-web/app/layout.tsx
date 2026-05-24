import './globals.css';
import type { ReactNode } from 'react';

export const metadata = {
  title: 'FIFA Admin',
  description: 'Back-office de gestion des tickets, agents et TPE',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}

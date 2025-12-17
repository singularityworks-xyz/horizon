import type { Metadata } from 'next';
import '@horizon/ui/styles.css';

export const metadata: Metadata = {
  title: 'Horizon - Client Portal',
  description: 'Client-facing project intake and execution hub',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <main>{children}</main>
      </body>
    </html>
  );
}

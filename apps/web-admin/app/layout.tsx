import type { Metadata } from 'next';
import '@horizon/ui/styles.css';

export const metadata: Metadata = {
  title: 'Horizon - Admin Portal',
  description: 'Admin control plane for managing Horizon projects and workflows',
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

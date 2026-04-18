import type { Metadata } from 'next';
import './globals.css';
import '@mysten/dapp-kit/dist/index.css';
import { Providers } from './providers';
import { HexBackground } from './components/HexBackground';
import { NetworkCursor } from './components/NetworkCursor';

export const metadata: Metadata = {
  title: 'DocuLock - Document Timestamping & Authenticity Verifier',
  description: 'Proof of Existence on SUI Blockchain - Store document hashes and verify authenticity',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <HexBackground />
        <NetworkCursor />
        <div className="bg-gradient-overlay" />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

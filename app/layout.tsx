import type { Metadata } from "next";
import "./globals.css";
import "@mysten/dapp-kit/dist/index.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "DocuLock - Document Timestamping & Authenticity Verifier",
  description:
    "Proof of Existence on SUI Blockchain - Store document hashes and verify authenticity",
  metadataBase: new URL("https://doculock.docs.cmdocs.sh"),
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

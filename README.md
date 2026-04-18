# DocuLock - Proof of Existence on SUI

Document Timestamping & Authenticity Verifier using SUI Blockchain.

## Overview

DocuLock allows users to upload any file (legal contracts, art, research papers) and store its cryptographic hash on the SUI blockchain. This provides an immutable timestamp proof that the document existed at a specific point in time.

### Use Cases

- **Legal**: Prove contracts existed before a certain date
- **IP Protection**: Establish priority for research and creative works
- **Compliance**: Document audit trails with blockchain timestamps
- **Evidence**: Create tamper-proof records

## Features

- 🔐 SHA-256 file hashing
- ⛓ On-chain storage on SUI blockchain
- ✅ Document authenticity verification
- 📋 Personal document history
- 📱 QR code generation for sharing proofs
- ⚡ Fast finality (< 1s)
- 💰 Low gas fees (~0.002 MIST)

## Getting Started

### Prerequisites

- Node.js 18+
- Sui Wallet extension
- SUI Testnet account

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

### Configuration

Create a `.env.local` file:

```env
NEXT_PUBLIC_SUI_NETWORK=testnet
NEXT_PUBLIC_SUI_RPC_URL=https://fullnode.testnet.sui.io
NEXT_PUBLIC_DOCULOCK_PACKAGE_ID=<your_package_id>
NEXT_PUBLIC_DOCULOCK_REGISTRY_ID=<your_registry_id>
```

### Deploy Smart Contract

```bash
cd contracts/doculock

# Build the Move package
sui move build

# Deploy to testnet
sui client publish

# Save the package ID and registry object ID to .env.local
```

## How It Works

### Upload a Document

1. Select a file from your device
2. DocuLock calculates the SHA-256 hash locally
3. You sign a transaction to store the hash on-chain
4. The hash is permanently recorded with a timestamp

### Verify a Document

1. Upload the file to verify
2. DocuLock calculates its SHA-256 hash
3. Query the blockchain for a matching hash
4. If found, display the original metadata and timestamp

## Smart Contract

The contract (`contracts/doculock/sources/doculock.move`) provides:

- `create_registry` - Initialize the document registry
- `store_document` - Store a new document hash with metadata
- `verify_document` - Check if a document hash exists
- `get_document` - Retrieve document metadata

## File Structure

```
DocuLock/
├── app/
│   ├── components/
│   │   ├── DocumentCard.tsx
│   │   ├── DocumentHistory.tsx
│   │   ├── FileDropzone.tsx
│   │   ├── FileUploader.tsx
│   │   ├── FileVerifier.tsx
│   │   ├── HashDisplay.tsx
│   │   ├── QRModal.tsx
│   │   └── TrustBadge.tsx
│   ├── globals.css
│   ├── layout.tsx
│   ├── page.tsx
│   └── providers.tsx
├── contracts/
│   └── doculock/
│       └── sources/
│           └── doculock.move
├── lib/
│   ├── config.ts
│   ├── crypto.ts
│   ├── demo.ts
│   ├── doculock.ts
│   └── file.ts
├── public/
├── package.json
└── README.md
```

## Security Considerations

- **No file storage**: Only cryptographic hashes are stored on-chain
- **Client-side hashing**: Files never leave the user's device in clear text
- **Privacy**: Hash alone reveals nothing about file content
- **Immutability**: Once stored, hashes cannot be modified

## Supported File Types

- PDF documents
- Images (JPEG, PNG, GIF, WebP)
- Text files
- Word documents (.doc, .docx)
- Excel spreadsheets (.xls, .xlsx)

Maximum file size: 100MB

## Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Blockchain**: SUI
- **SDK**: @mysten/dapp-kit
- **Hashing**: Web Crypto API, @mysten/sui

## License

MIT

## Contributing

Contributions welcome! Please feel free to submit a Pull Request.

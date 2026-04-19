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

### Core Features
- 🔐 SHA-256 file hashing
- ⛓ On-chain storage on SUI blockchain
- ✅ Document authenticity verification
- 📋 Personal document history
- 📱 QR code generation for sharing proofs
- ⚡ Fast finality (< 1s)
- 💰 Low gas fees (~0.002 MIST)

### Advanced Features
- 📊 Analytics Dashboard - Real-time insights and statistics
- 🔄 Batch Processing - Upload multiple documents with PTB
- 📈 Export Reports - Generate PDF/CSV/JSON reports
- 🔍 MongoDB Indexer - Fast event querying
- 🔎 Full-text Search - Find documents quickly
- 🛡️ Fraud Detection Simulation - Test security features
- 🔌 REST API - Programmatic access

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
# Sui Network Configuration
NEXT_PUBLIC_SUI_NETWORK=testnet
NEXT_PUBLIC_SUI_RPC_URL=https://fullnode.testnet.sui.io

# DocuLock Contract
NEXT_PUBLIC_DOCULOCK_PACKAGE_ID=<your_package_id>
NEXT_PUBLIC_DOCULOCK_REGISTRY_ID=<your_registry_id>

# MongoDB (for indexer/analytics)
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/doculock?retryWrites=true&w=majority
MONGODB_DB_NAME=doculock
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

### Batch Upload Multiple Documents

1. Select multiple files or upload a ZIP archive
2. Web Workers calculate hashes in parallel
3. Store all documents in a single Programmable Transaction Block (PTB)
4. Save gas costs with atomic batch operations

### Verify a Document

1. Upload the file to verify
2. DocuLock calculates its SHA-256 hash
3. Query the blockchain for a matching hash
4. If found, display the original metadata and timestamp

### Analytics & Reporting

1. MongoDB indexer syncs blockchain events
2. Real-time analytics dashboard updates
3. Export reports in PDF, CSV, or JSON format
4. Track usage patterns and gas consumption

## Smart Contract

The contract (`contracts/doculock/sources/doculock.move`) provides:

- `create_registry` - Initialize the document registry
- `store_document` - Store a new document hash with metadata (file name, size, MIME type, timestamp)
- `verify_document` - Check if a document hash exists
- `get_document` - Retrieve document metadata (creator, timestamp, file details)
- `total_documents` - Get total number of stored documents

**Data Stored:**
- Document hash (SHA-256)
- File name
- File size
- MIME type
- Creator address
- Timestamp (milliseconds)

**Events Emitted:**
- `DocumentStored` - Triggered when a document is stored successfully

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
│   │   ├── TrustBadge.tsx
│   │   ├── AnalyticsDashboard.tsx
│   │   ├── BatchUploader.tsx
│   │   └── FraudSimulation.tsx
│   ├── api/
│   │   ├── documents/route.ts
│   │   ├── verify/route.ts
│   │   ├── analytics/route.ts
│   │   └── export/route.ts
│   ├── globals.css
│   ├── layout.tsx
│   ├── page.tsx
│   └── providers.tsx
├── contracts/
│   └── doculock/
│       ├── sources/
│       │   └── doculock.move
│       └── Move.toml
├── indexer/
│   ├── mongodb/
│   │   ├── schemas.ts
│   │   └── sync.ts
│   └── config.ts
├── lib/
│   ├── config.ts
│   ├── crypto.ts
│   ├── doculock.ts
│   ├── file.ts
│   ├── export.ts
│   ├── pdfExport.ts
│   └── hashWorker.ts
├── docs/
│   ├── index.mdx
│   ├── quickstart.mdx
│   ├── features/
│   │   ├── analytics.mdx
│   │   ├── batch-processing.mdx
│   │   ├── export-reporting.mdx
│   │   └── verification.mdx
│   ├── api/
│   │   └── rest-api.mdx
│   └── guides/
│       └── setup.mdx
├── public/
│   ├── workers/
│   │   └── hashWorker.js
│   └── Doculock_banner.png
├── package.json
└── README.md
```

## Security Considerations

- **No file storage**: Only cryptographic hashes are stored on-chain
- **Client-side hashing**: Files never leave the user's device in clear text
- **Privacy**: Hash alone reveals nothing about file content
- **Immutability**: Once stored, hashes cannot be modified
- **Fraud detection**: Single bit change produces completely different hash
- **Atomic transactions**: Batch operations succeed or fail together
- **Wallet security**: All transactions require wallet signature

## Supported File Types

- PDF documents
- Images (JPEG, PNG, GIF, WebP)
- Text files (TXT, MD, JSON)
- Word documents (.doc, .docx)
- Excel spreadsheets (.xls, .xlsx)
- ZIP archives (for batch extraction)

Maximum file size: 100MB per file
Batch limit: Up to 50 documents per transaction

## Tech Stack

### Frontend
- **Framework**: Next.js 14 with App Router
- **UI**: React 18, TypeScript, Tailwind CSS
- **Data Fetching**: React Query (@tanstack/react-query)
- **Web3**: @mysten/dapp-kit, @mysten/sui
- **Export**: jspdf, jspdf-autotable
- **QR Codes**: qrcode
- **Hashing**: Web Crypto API, Web Workers

### Blockchain
- **Network**: Sui Network (Testnet/Mainnet)
- **Smart Contract**: Move language
- **Transactions**: Programmable Transaction Blocks (PTB)
- **Object Model**: Sui object system

### Backend & Indexing
- **Database**: MongoDB Atlas
- **Indexing**: Custom MongoDB indexer
- **API**: Next.js API routes
- **Full-text Search**: MongoDB text search
- **Pagination**: Cursor-based pagination

### Cryptography
- **Hash Algorithm**: SHA-256
- **Proof**: Deterministic hashing
- **Security**: Client-side processing

## API Reference

DocuLock provides a REST API for programmatic access:

### Verify Document
```bash
POST /api/verify
Content-Type: application/json

{
  "hash": "a1b2c3d4e5f6..."
}
```

### Get Documents
```bash
GET /api/documents?page=1&limit=20&creator=0x1234...
```

### Get Analytics
```bash
GET /api/analytics/stats
GET /api/analytics/trends?days=30
```

### Export Reports
```bash
POST /api/export
Content-Type: application/json

{
  "format": "pdf",
  "startDate": "2024-01-01",
  "endDate": "2024-01-31"
}
```

See [API Documentation](docs/api/rest-api.mdx) for complete reference.

## Documentation

- **Quick Start**: [docs/quickstart.mdx](docs/quickstart.mdx)
- **Setup Guide**: [docs/guides/setup.mdx](docs/guides/setup.mdx)
- **Features**:
  - [Analytics Dashboard](docs/features/analytics.mdx)
  - [Batch Processing](docs/features/batch-processing.mdx)
  - [Export & Reporting](docs/features/export-reporting.mdx)
  - [Document Verification](docs/features/verification.mdx)
- **API Reference**: [docs/api/rest-api.mdx](docs/api/rest-api.mdx)
- **Indexer**: [docs/indexer.mdx](docs/indexer.mdx)

## License

MIT

## Contributing

Contributions welcome! Please feel free to submit a Pull Request.

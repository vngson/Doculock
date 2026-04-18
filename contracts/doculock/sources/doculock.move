/// DocuLock — Proof of Existence on SUI.
///
/// Stores hashes of documents on-chain to provide immutable timestamping
/// and authenticity verification for any file type.
module doculock::doculock {
    use std::string::String;
    use sui::table::{Self, Table};
    use sui::event;
    use sui::clock::Clock;

    // ── Errors ──────────────────────────────────────────────────────────────────

    const EHashAlreadyExists: u64 = 1;
    const EInvalidFileSize: u64 = 2;

    // ── Data structures ─────────────────────────────────────────────────────────

    /// Single document record stored on-chain.
    public struct Document has store, copy, drop {
        creator: address,
        timestamp: u64,
        file_name: String,
        file_size: u64,
        file_hash: vector<u8>,
        mime_type: String,
    }

    /// Shared registry that holds all documents, keyed by hash.
    public struct DocumentRegistry has key {
        id: UID,
        documents: Table<vector<u8>, Document>,
        total: u64,
    }

    // ── Events ──────────────────────────────────────────────────────────────────

    /// Emitted when a new document is stored on-chain.
    public struct DocumentStored has copy, drop {
        document_hash: vector<u8>,
        creator: address,
        timestamp: u64,
        file_name: String,
        file_size: u64,
        mime_type: String,
    }

    // ── Create registry ─────────────────────────────────────────────────────────

    /// Create a new shared DocumentRegistry. Called once during deployment.
    public fun create_registry(ctx: &mut TxContext) {
        let registry = DocumentRegistry {
            id: object::new(ctx),
            documents: table::new(ctx),
            total: 0,
        };
        transfer::share_object(registry);
    }

    // ── Store a new document ───────────────────────────────────────────────────

    /// Store a document hash and metadata on-chain.
    /// This creates an immutable timestamp proof of existence.
    public fun store_document(
        registry: &mut DocumentRegistry,
        clock: &Clock,
        file_hash: vector<u8>,
        file_name: String,
        file_size: u64,
        mime_type: String,
        ctx: &mut TxContext,
    ) {
        // Assert hash does not already exist
        assert!(!table::contains(&registry.documents, file_hash), EHashAlreadyExists);
        // Assert file size is valid (greater than 0)
        assert!(file_size > 0, EInvalidFileSize);

        let timestamp = clock.timestamp_ms();

        let document = Document {
            creator: ctx.sender(),
            timestamp,
            file_name,
            file_size,
            file_hash,
            mime_type,
        };

        table::add(&mut registry.documents, file_hash, document);
        registry.total = registry.total + 1;

        event::emit(DocumentStored {
            document_hash: file_hash,
            creator: ctx.sender(),
            timestamp,
            file_name: table::borrow(&registry.documents, file_hash).file_name,
            file_size: table::borrow(&registry.documents, file_hash).file_size,
            mime_type: table::borrow(&registry.documents, file_hash).mime_type,
        });
    }

    // ── Verify a document exists ───────────────────────────────────────────────

    /// Check if a document hash exists on-chain.
    public fun verify_document(registry: &DocumentRegistry, file_hash: vector<u8>): bool {
        table::contains(&registry.documents, file_hash)
    }

    // ── Get a document by hash ────────────────────────────────────────────────

    /// Retrieve a document record by its hash.
    public fun get_document(registry: &DocumentRegistry, file_hash: vector<u8>): (&Document, bool) {
        if (table::contains(&registry.documents, file_hash)) {
            (table::borrow(&registry.documents, file_hash), true)
        } else {
            abort 0
        }
    }

    // ── Total documents ───────────────────────────────────────────────────────

    /// Get the total number of documents stored.
    public fun total_documents(registry: &DocumentRegistry): u64 {
        registry.total
    }

    // ── Accessors ─────────────────────────────────────────────────────────────

    /// Get the creator of a document.
    public fun document_creator(doc: &Document): address { doc.creator }

    /// Get the timestamp of a document.
    public fun document_timestamp(doc: &Document): u64 { doc.timestamp }

    /// Get the file name of a document.
    public fun document_file_name(doc: &Document): String { doc.file_name }

    /// Get the file size of a document.
    public fun document_file_size(doc: &Document): u64 { doc.file_size }

    /// Get the hash of a document.
    public fun document_file_hash(doc: &Document): vector<u8> { doc.file_hash }

    /// Get the MIME type of a document.
    public fun document_mime_type(doc: &Document): String { doc.mime_type }
}

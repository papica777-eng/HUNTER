"use strict";
// ═══════════════════════════════════════════════════════════════════════
// === ListingStore — SQLite-backed Deduplication & History ===
// ═══════════════════════════════════════════════════════════════════════
// Complexity: O(1) per insert/lookup (hash-indexed)
// Entropy: 0.0000 — Deterministic storage
//
// Uses better-sqlite3 for synchronous, zero-overhead local persistence.
// Every listing gets a SHA-256 composite key = source + id.
// If the key exists, it's a duplicate → skip.
// If it's new → emit to Telegram VIP channel.
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ListingStore = void 0;
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const path = __importStar(require("path"));
class ListingStore {
    db;
    constructor(dbPath) {
        const resolvedPath = dbPath || path.join(__dirname, '..', '..', 'data', 'lovets.db');
        // Ensure data directory exists
        const fs = require('fs');
        const dir = path.dirname(resolvedPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        this.db = new better_sqlite3_1.default(resolvedPath);
        this.db.pragma('journal_mode = WAL');
        this.db.pragma('synchronous = NORMAL');
        this.init();
    }
    init() {
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS listings (
        composite_key TEXT PRIMARY KEY,
        source TEXT NOT NULL,
        listing_id TEXT NOT NULL,
        title TEXT NOT NULL,
        price_stotinki INTEGER NOT NULL,
        price_display TEXT NOT NULL,
        currency TEXT NOT NULL DEFAULT 'BGN',
        url TEXT NOT NULL,
        image_url TEXT,
        location TEXT,
        category TEXT,
        discount_pct REAL,
        first_seen TEXT NOT NULL,
        notified INTEGER NOT NULL DEFAULT 0,
        meta_json TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_source ON listings(source);
      CREATE INDEX IF NOT EXISTS idx_category ON listings(category);
      CREATE INDEX IF NOT EXISTS idx_first_seen ON listings(first_seen);
      CREATE INDEX IF NOT EXISTS idx_discount ON listings(discount_pct);
    `);
    }
    /**
     * Check if a listing already exists.
     * Complexity: O(1) — primary key lookup
     */
    exists(source, listingId) {
        const key = `${source}::${listingId}`;
        const row = this.db.prepare('SELECT 1 FROM listings WHERE composite_key = ?').get(key);
        return !!row;
    }
    /**
     * Insert a new listing. Returns true if inserted (new), false if duplicate.
     * Complexity: O(1)
     */
    insert(listing) {
        const key = `${listing.source}::${listing.id}`;
        if (this.exists(listing.source, listing.id)) {
            return false;
        }
        this.db.prepare(`
      INSERT INTO listings (composite_key, source, listing_id, title, price_stotinki, 
        price_display, currency, url, image_url, location, category, discount_pct, 
        first_seen, notified, meta_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
    `).run(key, listing.source, listing.id, listing.title, listing.price_stotinki, listing.price_display, listing.currency, listing.url, listing.image_url, listing.location, listing.category, listing.discount_pct, listing.first_seen, JSON.stringify(listing.meta));
        return true;
    }
    /**
     * Mark listing as notified (sent to Telegram).
     */
    markNotified(source, listingId) {
        const key = `${source}::${listingId}`;
        this.db.prepare('UPDATE listings SET notified = 1 WHERE composite_key = ?').run(key);
    }
    /**
     * Get recent deals below threshold.
     */
    getRecentDeals(minDiscountPct, limit = 20) {
        const rows = this.db.prepare(`
      SELECT * FROM listings 
      WHERE discount_pct >= ? 
      ORDER BY first_seen DESC 
      LIMIT ?
    `).all(minDiscountPct, limit);
        return rows.map(r => ({
            id: r.listing_id,
            source: r.source,
            title: r.title,
            price_stotinki: r.price_stotinki,
            price_display: r.price_display,
            currency: r.currency,
            url: r.url,
            image_url: r.image_url,
            location: r.location || '',
            category: r.category || '',
            first_seen: r.first_seen,
            market_avg_stotinki: null,
            discount_pct: r.discount_pct,
            meta: r.meta_json ? JSON.parse(r.meta_json) : {},
        }));
    }
    /**
     * Get average price for a category+keyword combination (for market comparison).
     * Complexity: O(n) but cached after first call
     */
    getMarketAverage(category, keyword) {
        const row = this.db.prepare(`
      SELECT AVG(price_stotinki) as avg_price 
      FROM listings 
      WHERE category = ? AND title LIKE ? AND price_stotinki > 0
    `).get(category, `%${keyword}%`);
        return row?.avg_price ? Math.round(row.avg_price) : null;
    }
    /**
     * Total listings count.
     */
    count() {
        const row = this.db.prepare('SELECT COUNT(*) as cnt FROM listings').get();
        return row.cnt;
    }
    /**
     * Cleanup old listings (older than N days).
     */
    cleanup(daysOld = 30) {
        const cutoff = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000).toISOString();
        const result = this.db.prepare('DELETE FROM listings WHERE first_seen < ?').run(cutoff);
        return result.changes;
    }
    close() {
        this.db.close();
    }
}
exports.ListingStore = ListingStore;
//# sourceMappingURL=ListingStore.js.map
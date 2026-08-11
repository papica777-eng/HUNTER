import Database from 'better-sqlite3';
import * as path from 'path';
import { Listing } from '../types';

export class ListingStore {
  private db: Database.Database;

  constructor(dbPath?: string) {
    const resolvedPath = dbPath || path.join(__dirname, '..', '..', 'data', 'lovets.db');
    const fs = require('fs');
    const dir = path.dirname(resolvedPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    this.db = new Database(resolvedPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('synchronous = NORMAL');
    this.init();
  }

  private init(): void {
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

  exists(source: string, listingId: string): boolean {
    const key = `${source}::${listingId}`;
    const row = this.db.prepare('SELECT 1 FROM listings WHERE composite_key = ?').get(key);
    return !!row;
  }

  insert(listing: Listing): boolean {
    const key = `${listing.source}::${listing.id}`;
    if (this.exists(listing.source, listing.id)) {
      return false;
    }

    this.db.prepare(`
      INSERT INTO listings (composite_key, source, listing_id, title, price_stotinki, 
        price_display, currency, url, image_url, location, category, discount_pct, 
        first_seen, notified, meta_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
    `).run(
      key,
      listing.source,
      listing.id,
      listing.title,
      listing.price_stotinki,
      listing.price_display,
      listing.currency,
      listing.url,
      listing.image_url,
      listing.location,
      listing.category,
      listing.discount_pct,
      listing.first_seen,
      JSON.stringify(listing.meta)
    );

    return true;
  }

  markNotified(source: string, listingId: string): void {
    const key = `${source}::${listingId}`;
    this.db.prepare('UPDATE listings SET notified = 1 WHERE composite_key = ?').run(key);
  }

  getRecentDeals(minDiscountPct: number, limit: number = 20): Listing[] {
    const rows = this.db.prepare(`
      SELECT * FROM listings 
      WHERE discount_pct >= ? 
      ORDER BY first_seen DESC 
      LIMIT ?
    `).all(minDiscountPct, limit) as any[];

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

  getMarketAverage(category: string, keyword: string): number | null {
    const row = this.db.prepare(`
      SELECT AVG(price_stotinki) as avg_price 
      FROM listings 
      WHERE category = ? AND title LIKE ? AND price_stotinki > 0
    `).get(category, `%${keyword}%`) as any;

    return row?.avg_price ? Math.round(row.avg_price) : null;
  }

  count(): number {
    const row = this.db.prepare('SELECT COUNT(*) as cnt FROM listings').get() as any;
    return row.cnt;
  }

  cleanup(daysOld: number = 30): number {
    const cutoff = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000).toISOString();
    const result = this.db.prepare('DELETE FROM listings WHERE first_seen < ?').run(cutoff);
    return result.changes;
  }

  close(): void {
    this.db.close();
  }
}

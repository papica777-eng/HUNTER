import { Listing } from '../types';
import { ListingStore } from '../storage/ListingStore';

export class PriceAnalyzer {
  private store: ListingStore;
  private discountThreshold: number;

  private static PRICE_ANCHORS: Record<string, Record<string, number>> = {
    cars: {
      'bmw': 1500000,
      'audi': 1400000,
      'mercedes': 1600000,
      'vw': 900000,
      'opel': 600000,
      'toyota': 1200000,
      'ford': 700000,
      'peugeot': 500000,
      'renault': 500000,
      'hyundai': 800000,
      'honda': 900000,
      'mazda': 800000,
      'skoda': 700000,
      'seat': 600000,
      'fiat': 400000,
      'nissan': 700000,
      'kia': 700000,
      'volvo': 1000000,
      'citroen': 500000,
      'dacia': 500000,
    },
    electronics: {
      'iphone': 150000,
      'samsung': 120000,
      'laptop': 100000,
      'macbook': 200000,
      'playstation': 60000,
      'xbox': 50000,
      'ipad': 80000,
      'телевизор': 60000,
      'monitor': 40000,
      'видеокарта': 80000,
      'процесор': 40000,
    },
    properties: {
      '1-стаен': 8000000,
      '2-стаен': 12000000,
      '3-стаен': 16000000,
      '4-стаен': 20000000,
      'къща': 15000000,
      'парцел': 5000000,
      'гараж': 2000000,
    },
  };

  constructor(store: ListingStore, discountThreshold: number = 20) {
    this.store = store;
    this.discountThreshold = discountThreshold;
  }

  analyzeAndFilterDeals(listings: Listing[]): Listing[] {
    const deals: Listing[] = [];

    for (const listing of listings) {
      const marketAvg = this.estimateMarketPrice(listing);

      if (marketAvg && marketAvg > 0) {
        listing.market_avg_stotinki = marketAvg;

        const discountPct = ((marketAvg - listing.price_stotinki) / marketAvg) * 100;
        listing.discount_pct = Math.round(discountPct * 10) / 10;

        if (discountPct >= this.discountThreshold) {
          deals.push(listing);
        }
      }
    }

    deals.sort((a, b) => (b.discount_pct || 0) - (a.discount_pct || 0));

    return deals;
  }

  private estimateMarketPrice(listing: Listing): number | null {
    const titleLower = listing.title.toLowerCase();
    const category = listing.category;

    const keywords = titleLower.split(/[\s,\-]+/).filter(w => w.length > 2);
    for (const keyword of keywords) {
      const dbAvg = this.store.getMarketAverage(category, keyword);
      if (dbAvg && dbAvg > 0) {
        return dbAvg;
      }
    }

    const anchors = PriceAnalyzer.PRICE_ANCHORS[category];
    if (anchors) {
      for (const [keyword, avgPrice] of Object.entries(anchors)) {
        if (titleLower.includes(keyword.toLowerCase())) {
          return avgPrice;
        }
      }
    }

    return null;
  }

  static formatDealMessage(listing: Listing): string {
    const sourceEmoji: Record<string, string> = {
      'olx': '🟢 OLX.bg',
      'mobilebg': '🚗 Mobile.bg',
      'imotbg': '🏠 Imot.bg',
      'bazarbg': '🛒 Bazar.bg',
    };

    const source = sourceEmoji[listing.source] || listing.source;
    const discount = listing.discount_pct
      ? `🔥 -${listing.discount_pct}% ПОД ПАЗАРНАТА ЦЕНА`
      : '';

    const metaLines: string[] = [];
    if (listing.meta['year']) metaLines.push(`📅 Година: ${listing.meta['year']}`);
    if (listing.meta['mileage']) metaLines.push(`🔧 Пробег: ${listing.meta['mileage']} км`);
    if (listing.meta['sqm']) metaLines.push(`📐 Площ: ${listing.meta['sqm']} кв.м`);
    if (listing.meta['rooms']) metaLines.push(`🚪 Стаи: ${listing.meta['rooms']}`);
    if (listing.location) metaLines.push(`📍 ${listing.location}`);

    const metaStr = metaLines.length > 0 ? '\n' + metaLines.join('\n') : '';

    return [
      `${source}`,
      ``,
      `📌 *${escapeMarkdown(listing.title)}*`,
      `💰 *${escapeMarkdown(listing.price_display)}*`,
      discount ? `${discount}` : '',
      metaStr,
      ``,
      `⏰ ${new Date(listing.first_seen).toLocaleString('bg-BG')}`,
    ].filter(Boolean).join('\n');
  }
}

function escapeMarkdown(text: string): string {
  return text.replace(/[_*[\]()~`>#+=|{}.!\\-]/g, '\\$&');
}

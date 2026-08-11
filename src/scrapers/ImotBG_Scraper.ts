import * as cheerio from 'cheerio';
import { BaseScraper } from './BaseScraper';
import { Listing, ScrapeResult, parsePriceToBGNStotinki } from '../types';

export class ImotBGScraper extends BaseScraper {
  private cityUrls: Record<string, string> = {
    'sofia': 'grad=1',
    'plovdiv': 'grad=2',
    'varna': 'grad=3',
    'burgas': 'grad=4',
    'ruse': 'grad=5',
    'stara-zagora': 'grad=6',
    'pleven': 'grad=7',
  };

  constructor(enabled: boolean = true) {
    super('Imot.bg', 'https://www.imot.bg', enabled);
  }

  async scrape(categories: string[] = ['properties']): Promise<ScrapeResult> {
    const startTime = Date.now();
    const allListings: Listing[] = [];
    const errors: string[] = [];

    const cities = process.env.IMOTBG_CITIES?.split(',') || ['sofia', 'plovdiv', 'varna'];

    for (const city of cities) {
      try {
        const cityParam = this.cityUrls[city.trim()] || 'grad=1';
        const searchUrl = `${this.baseUrl}/pcgi/imot.cgi?act=3&slink=b0w7pk&f1=1&${cityParam}&sort=1`;

        console.log(`[Imot.bg] Скрапване на имоти в ${city}...`);
        const html = await this.fetchPage(searchUrl);
        const listings = this.parseListings(html, 'properties');

        listings.forEach(l => {
          l.location = city;
          l.meta['city'] = city;
        });

        allListings.push(...listings);
        console.log(`[Imot.bg] Намерени ${listings.length} обяви в ${city}`);
      } catch (error: any) {
        const errMsg = error?.message || String(error);
        errors.push(`[Imot.bg] ${city}: ${errMsg}`);
        console.error(`[Imot.bg] Грешка при ${city}: ${errMsg}`);
      }
    }

    return {
      source: 'Imot.bg',
      listings: allListings,
      errors,
      duration_ms: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    };
  }

  parseListings(html: string, category: string): Listing[] {
    const $ = cheerio.load(html);
    const listings: Listing[] = [];

    $('table.tablereset, .listResult a, .advItem, .lnk1, .lnk2').each((_index, element) => {
      try {
        const $el = $(element);

        const linkEl = $el.is('a') ? $el : $el.find('a[href*="act=5"]').first();
        let url = linkEl.attr('href') || '';
        if (!url) return;

        const fullUrl = url.startsWith('http') ? url : `${this.baseUrl}/${url.replace(/^\//, '')}`;

        const idMatch = url.match(/adv=([^&]+)/) || url.match(/slink=([^&]+)/);
        const id = idMatch ? idMatch[1] : `imot_${Date.now()}_${_index}`;

        const title = linkEl.text().trim()
          || $el.find('a').first().text().trim()
          || '';

        if (!title || title.length < 3) return;

        let priceText = '';
        $el.find('td, span, div, strong').each((_i, td) => {
          const text = $(td).text().trim();
          if (/\d+.*(?:лв|EUR|€)/i.test(text) && !priceText) {
            priceText = text;
          }
        });

        if (!priceText || !/\d/.test(priceText)) return;

        const { stotinki, currency } = parsePriceToBGNStotinki(priceText);
        if (stotinki <= 0) return;

        const imgEl = $el.find('img').first();
        const imageUrl = imgEl.attr('src') || imgEl.attr('data-original') || null;

        const meta: Record<string, string> = {};
        const sqmMatch = title.match(/([\d.]+)\s*(?:кв\.?\s*м|m2|sqm)/i);
        const roomMatch = title.match(/(\d+)\s*(?:стаен|стая|стаи|room)/i);
        if (sqmMatch) meta['sqm'] = sqmMatch[1];
        if (roomMatch) meta['rooms'] = roomMatch[1];

        listings.push({
          id,
          source: 'imotbg',
          title: title.substring(0, 200),
          price_stotinki: stotinki,
          price_display: priceText,
          currency,
          url: fullUrl,
          image_url: imageUrl,
          location: '',
          category: 'properties',
          first_seen: new Date().toISOString(),
          market_avg_stotinki: null,
          discount_pct: null,
          meta,
        });
      } catch {
        // Skip malformed entries
      }
    });

    return listings;
  }
}

import * as cheerio from 'cheerio';
import { BaseScraper } from './BaseScraper';
import { Listing, ScrapeResult, parsePriceToBGNStotinki } from '../types';

export class OLXScraper extends BaseScraper {
  private categoryUrls: Record<string, string> = {
    'cars': '/d/avto/q-/',
    'electronics': '/d/elektronika/q-/',
    'properties': '/d/imoti/q-/',
    'phones': '/d/telefoni-i-aksesoa/q-/',
    'furniture': '/d/dom-i-gradina/q-/',
    'sports': '/d/sport/q-/',
    'clothes': '/d/moda/q-/',
    'all': '/d/ads/q-/',
  };

  constructor(enabled: boolean = true) {
    super('OLX.bg', 'https://www.olx.bg', enabled);
  }

  async scrape(categories: string[] = ['cars', 'electronics', 'properties']): Promise<ScrapeResult> {
    const startTime = Date.now();
    const allListings: Listing[] = [];
    const errors: string[] = [];

    for (const category of categories) {
      try {
        const urlPath = this.categoryUrls[category] || this.categoryUrls['all'];
        const url = `${this.baseUrl}${urlPath}?search%5Border%5D=created_at%3Adesc`;

        console.log(`[OLX] Скрапване на категория: ${category} → ${url}`);
        const html = await this.fetchPage(url);
        const listings = this.parseListings(html, category);
        allListings.push(...listings);
        console.log(`[OLX] Намерени ${listings.length} обяви в ${category}`);
      } catch (error: any) {
        const errMsg = error?.message || String(error);
        errors.push(`[OLX] ${category}: ${errMsg}`);
        console.error(`[OLX] Грешка при ${category}: ${errMsg}`);
      }
    }

    return {
      source: 'OLX.bg',
      listings: allListings,
      errors,
      duration_ms: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    };
  }

  parseListings(html: string, category: string): Listing[] {
    const $ = cheerio.load(html);
    const listings: Listing[] = [];

    $('[data-cy="l-card"]').each((_index, element) => {
      try {
        const $el = $(element);

        const linkEl = $el.find('a[href*="/d/"]').first();
        const url = linkEl.attr('href') || '';
        const fullUrl = url.startsWith('http') ? url : `${this.baseUrl}${url}`;

        const idMatch = url.match(/ID([a-zA-Z0-9]+)/i) || url.match(/-(\d+)\.html/);
        const id = idMatch ? idMatch[1] : `olx_${Date.now()}_${_index}`;

        const title = $el.find('h6').first().text().trim()
          || $el.find('[data-cy="ad-card-title"]').text().trim()
          || linkEl.attr('title')?.trim()
          || '';

        if (!title) return;

        const priceText = $el.find('[data-testid="ad-price"]').text().trim()
          || $el.find('p').filter((_i, p) => /лв|EUR|€/i.test($(p).text())).first().text().trim()
          || '';

        if (!priceText || /по договаряне|безплатно/i.test(priceText)) return;

        const { stotinki, currency } = parsePriceToBGNStotinki(priceText);
        if (stotinki <= 0) return;

        const imgEl = $el.find('img').first();
        const imageUrl = imgEl.attr('src') || imgEl.attr('data-src') || null;

        const locationText = $el.find('[data-testid="location-date"]').text().trim()
          || $el.find('small').last().text().trim()
          || '';
        const location = locationText.split(' - ')[0]?.trim() || locationText.split(',')[0]?.trim() || '';

        listings.push({
          id,
          source: 'olx',
          title,
          price_stotinki: stotinki,
          price_display: priceText,
          currency,
          url: fullUrl,
          image_url: imageUrl,
          location,
          category,
          first_seen: new Date().toISOString(),
          market_avg_stotinki: null,
          discount_pct: null,
          meta: {},
        });
      } catch {
        // Skip malformed listings
      }
    });

    return listings;
  }
}

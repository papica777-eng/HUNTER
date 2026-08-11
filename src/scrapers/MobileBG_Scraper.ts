import * as cheerio from 'cheerio';
import { BaseScraper } from './BaseScraper';
import { Listing, ScrapeResult, parsePriceToBGNStotinki } from '../types';

export class MobileBGScraper extends BaseScraper {
  constructor(enabled: boolean = true) {
    super('Mobile.bg', 'https://www.mobile.bg', enabled);
  }

  async scrape(categories: string[] = ['cars']): Promise<ScrapeResult> {
    const startTime = Date.now();
    const allListings: Listing[] = [];
    const errors: string[] = [];

    try {
      const searchUrl = `${this.baseUrl}/pcgi/mobile.cgi?act=3&slink=stcp0h&f1=1&sort=1`;

      console.log(`[Mobile.bg] Скрапване на автомобили...`);
      const html = await this.fetchPage(searchUrl);
      const listings = this.parseListings(html, 'cars');
      allListings.push(...listings);
      console.log(`[Mobile.bg] Намерени ${listings.length} обяви`);
    } catch (error: any) {
      const errMsg = error?.message || String(error);
      errors.push(`[Mobile.bg]: ${errMsg}`);
      console.error(`[Mobile.bg] Грешка: ${errMsg}`);
    }

    return {
      source: 'Mobile.bg',
      listings: allListings,
      errors,
      duration_ms: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    };
  }

  parseListings(html: string, category: string): Listing[] {
    const $ = cheerio.load(html);
    const listings: Listing[] = [];

    $('form[name="search"] table.tablereset, table.topAdv, .listContainer a, .items a').each((_index, element) => {
      try {
        const $el = $(element);

        const linkEl = $el.is('a') ? $el : $el.find('a[href*="act=4"]').first();
        let url = linkEl.attr('href') || '';
        if (!url) return;

        const fullUrl = url.startsWith('http') ? url : `${this.baseUrl}/${url.replace(/^\//, '')}`;

        const idMatch = url.match(/adv=([^&]+)/) || url.match(/slink=([^&]+)/);
        const id = idMatch ? idMatch[1] : `mbg_${Date.now()}_${_index}`;

        const title = $el.find('a[href*="act=4"]').first().text().trim()
          || linkEl.text().trim()
          || '';

        if (!title || title.length < 3) return;

        let priceText = '';
        $el.find('td, span, div').each((_i, td) => {
          const text = $(td).text().trim();
          if (/\d+.*(?:лв|EUR|€)/i.test(text) && !priceText) {
            priceText = text;
          }
        });

        if (!priceText) {
          priceText = $el.next().text().trim();
        }

        if (!priceText || !/\d/.test(priceText)) return;

        const { stotinki, currency } = parsePriceToBGNStotinki(priceText);
        if (stotinki <= 0) return;

        const imgEl = $el.find('img').first();
        const imageUrl = imgEl.attr('src') || imgEl.attr('data-src') || null;
        const fullImageUrl = imageUrl && !imageUrl.startsWith('http') ?
          `${this.baseUrl}/${imageUrl.replace(/^\//, '')}` : imageUrl;

        const yearMatch = title.match(/(\d{4})\s*г\.?/);
        const kmMatch = title.match(/([\d\s]+)\s*км/i);

        const meta: Record<string, string> = {};
        if (yearMatch) meta['year'] = yearMatch[1];
        if (kmMatch) meta['mileage'] = kmMatch[1].replace(/\s/g, '');

        listings.push({
          id,
          source: 'mobilebg',
          title: title.substring(0, 200),
          price_stotinki: stotinki,
          price_display: priceText,
          currency,
          url: fullUrl,
          image_url: fullImageUrl,
          location: '',
          category: 'cars',
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

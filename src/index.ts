import * as dotenv from 'dotenv';
import * as cron from 'node-cron';
import { OLXScraper } from './scrapers/OLX_Scraper';
import { MobileBGScraper } from './scrapers/MobileBG_Scraper';
import { ImotBGScraper } from './scrapers/ImotBG_Scraper';
import { PriceAnalyzer } from './analysis/PriceAnalyzer';
import { ListingStore } from './storage/ListingStore';
import { TelegramUplink, MASTER_UPLINK_CODE } from './bot/TelegramUplink';
import { BaseScraper } from './scrapers/BaseScraper';
import { Listing } from './types';

dotenv.config();

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN || 'MOCK_TOKEN';
const CHANNEL_ID = process.env.TELEGRAM_VIP_CHANNEL_ID || '-1001234567890';
const SCAN_INTERVAL = parseInt(process.env.SCAN_INTERVAL_SECONDS || '30', 10);
const DISCOUNT_THRESHOLD = parseInt(process.env.PRICE_DISCOUNT_THRESHOLD || '20', 10);

const store = new ListingStore();
const analyzer = new PriceAnalyzer(store, DISCOUNT_THRESHOLD);
const bot = new TelegramUplink(TELEGRAM_TOKEN, CHANNEL_ID, store);

const scrapers: BaseScraper[] = [];

if (process.env.OLX_ENABLED !== 'false') {
  scrapers.push(new OLXScraper(true));
}
if (process.env.MOBILEBG_ENABLED !== 'false') {
  scrapers.push(new MobileBGScraper(true));
}
if (process.env.IMOTBG_ENABLED !== 'false') {
  scrapers.push(new ImotBGScraper(true));
}

console.log(`
╔═══════════════════════════════════════════════════════════╗
║         🎯 HUNTER — VIP Бот за Бързи Обяви v1.0         ║
║         Architect: Dimitar Prodromov                     ║
║         Authority: AETERNA_LOGOS                         ║
╠═══════════════════════════════════════════════════════════╣
║  Активни скрапери: ${scrapers.map(s => s.getName()).join(', ').padEnd(37)}║
║  Интервал:         ${String(SCAN_INTERVAL).padEnd(37)}║
║  Праг за отстъпка: ${(DISCOUNT_THRESHOLD + '%').padEnd(37)}║
║  Канал:            ${CHANNEL_ID.padEnd(37)}║
╚═══════════════════════════════════════════════════════════╝
`);

let isScanning = false;
let cycleCount = 0;

async function scanCycle(): Promise<void> {
  if (isScanning) {
    console.log('[HUNTER] ⏳ Предишният цикъл все още работи, пропускане...');
    return;
  }

  isScanning = true;
  cycleCount++;
  const startTime = Date.now();

  console.log(`\n[HUNTER] ═══ Цикъл #${cycleCount} ═══ ${new Date().toLocaleString('bg-BG')}`);

  let totalNew = 0;
  let totalDeals = 0;

  for (const scraper of scrapers) {
    if (!scraper.isEnabled()) continue;

    try {
      const categories = process.env.OLX_CATEGORIES?.split(',') || ['cars', 'electronics', 'properties'];
      const result = await scraper.scrape(categories);

      const newListings: Listing[] = [];
      for (const listing of result.listings) {
        if (store.insert(listing)) {
          newListings.push(listing);
        }
      }

      totalNew += newListings.length;
      console.log(`[${scraper.getName()}] ${result.listings.length} обяви, ${newListings.length} нови (${result.duration_ms}ms)`);

      if (result.errors.length > 0) {
        result.errors.forEach(e => console.error(`  ⚠️ ${e}`));
      }

      if (newListings.length > 0) {
        const deals = analyzer.analyzeAndFilterDeals(newListings);
        totalDeals += deals.length;

        for (const deal of deals) {
          await bot.sendDealAlert(deal);
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      }
    } catch (error: any) {
      console.error(`[${scraper.getName()}] ❌ Критична грешка: ${error?.message || error}`);
    }
  }

  const duration = Date.now() - startTime;
  console.log(`[HUNTER] ═══ Край на цикъл #${cycleCount}: ${totalNew} нови, ${totalDeals} сделки (${duration}ms) ═══`);

  isScanning = false;
}

async function main(): Promise<void> {
  console.log('[HUNTER] 🚀 Стартиране...');

  bot.start().catch(err => {
    console.error('[Telegram] ❌ Бот грешка:', err.message);
  });

  await scanCycle();

  const cronExpr = `*/${Math.max(1, Math.floor(SCAN_INTERVAL / 60)) || 1} * * * *`;
  cron.schedule(cronExpr, () => {
    scanCycle().catch(err => {
      console.error('[HUNTER] ❌ Грешка в цикъла:', err.message);
    });
  });

  if (SCAN_INTERVAL < 60) {
    setInterval(() => {
      scanCycle().catch(err => {
        console.error('[HUNTER] ❌ Грешка в цикъла:', err.message);
      });
    }, SCAN_INTERVAL * 1000);
  }

  console.log(`[HUNTER] ✅ Сканирането е активно! Следващо сканиране след ${SCAN_INTERVAL} секунди.`);

  cron.schedule('0 3 * * *', () => {
    const deleted = store.cleanup(30);
    console.log(`[HUNTER] 🧹 Почистване: ${deleted} стари обяви изтрити.`);
  });
}

process.on('SIGINT', async () => {
  console.log('\n[HUNTER] 🛑 Спиране...');
  await bot.stop();
  store.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n[HUNTER] 🛑 Спиране (SIGTERM)...');
  await bot.stop();
  store.close();
  process.exit(0);
});

main().catch(err => {
  console.error('[HUNTER] ❌ Фатална грешка:', err);
  process.exit(1);
});

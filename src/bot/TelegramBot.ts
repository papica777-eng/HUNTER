import { Bot, InlineKeyboard, Context } from 'grammy';
import { Listing } from '../types';
import { PriceAnalyzer } from '../analysis/PriceAnalyzer';
import { ListingStore } from '../storage/ListingStore';

export class LovetsBot {
  private bot: Bot;
  private channelId: string;
  private store: ListingStore;
  private sentCount: number = 0;

  constructor(token: string, channelId: string, store: ListingStore) {
    this.bot = new Bot(token);
    this.channelId = channelId;
    this.store = store;
    this.setupCommands();
  }

  private setupCommands(): void {
    this.bot.command('start', async (ctx: Context) => {
      await ctx.reply(
        `🎯 *HUNTER — VIP Бот за Бързи Обяви*\n\n` +
        `Получавай мигновени известия при обяви под пазарната цена в:\n` +
        `🟢 OLX\\.bg\n` +
        `🚗 Mobile\\.bg\n` +
        `🏠 Imot\\.bg\n\n` +
        `📊 Команди:\n` +
        `/stats — Статистика на бота\n` +
        `/deals — Последните 10 сделки\n` +
        `/help — Помощ\n\n` +
        `💰 VIP достъп: 29 лв/мес\n` +
        `📩 За абонамент: @papica777`,
        { parse_mode: 'MarkdownV2' }
      );
    });

    this.bot.command('stats', async (ctx: Context) => {
      const totalListings = this.store.count();
      await ctx.reply(
        `📊 *Статистика на HUNTER*\n\n` +
        `📦 Общо обяви в базата: ${totalListings}\n` +
        `🔔 Изпратени известия: ${this.sentCount}\n` +
        `⏱ Сканиране на всеки: ${process.env.SCAN_INTERVAL_SECONDS || '10'} секунди\n` +
        `🎯 Праг за отстъпка: ${process.env.PRICE_DISCOUNT_THRESHOLD || '20'}%`,
        { parse_mode: 'MarkdownV2' }
      );
    });

    this.bot.command('deals', async (ctx: Context) => {
      const threshold = parseInt(process.env.PRICE_DISCOUNT_THRESHOLD || '20', 10);
      const deals = this.store.getRecentDeals(threshold, 10);

      if (deals.length === 0) {
        await ctx.reply('🔍 Няма намерени сделки под прага. Ботът продължава да сканира...');
        return;
      }

      for (const deal of deals.slice(0, 5)) {
        await this.sendDealToChat(ctx, deal);
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    });

    this.bot.command('help', async (ctx: Context) => {
      await ctx.reply(
        `🎯 *HUNTER — Как работи?*\n\n` +
        `1\\. Ботът сканира OLX, Mobile\\.bg и Imot\\.bg на всеки 10 секунди\\.\n` +
        `2\\. Сравнява цената с пазарната средна\\.\n` +
        `3\\. Ако обявата е 20%\\+ ПОД средната — получаваш мигновено известие\\.\n` +
        `4\\. Натискаш бутона "Виж обявата" и се свързваш с продавача ПРЕДИ другите\\.\n\n` +
        `📩 За VIP достъп: @papica777`,
        { parse_mode: 'MarkdownV2' }
      );
    });
  }

  async sendDealAlert(listing: Listing): Promise<void> {
    try {
      const message = PriceAnalyzer.formatDealMessage(listing);
      const keyboard = new InlineKeyboard().url('🔗 Виж обявата', listing.url);

      if (listing.image_url) {
        try {
          await this.bot.api.sendPhoto(this.channelId, listing.image_url, {
            caption: message,
            parse_mode: 'MarkdownV2',
            reply_markup: keyboard,
          });
        } catch {
          await this.bot.api.sendMessage(this.channelId, message, {
            parse_mode: 'MarkdownV2',
            reply_markup: keyboard,
            link_preview_options: { is_disabled: true },
          });
        }
      } else {
        await this.bot.api.sendMessage(this.channelId, message, {
          parse_mode: 'MarkdownV2',
          reply_markup: keyboard,
          link_preview_options: { is_disabled: true },
        });
      }

      this.store.markNotified(listing.source, listing.id);
      this.sentCount++;
      console.log(`[Telegram] ✅ Изпратено: ${listing.title} (${listing.price_display})`);
    } catch (error: any) {
      console.error(`[Telegram] ❌ Грешка при изпращане: ${error?.message || error}`);
    }
  }

  private async sendDealToChat(ctx: Context, listing: Listing): Promise<void> {
    const message = PriceAnalyzer.formatDealMessage(listing);
    const keyboard = new InlineKeyboard().url('🔗 Виж обявата', listing.url);

    await ctx.reply(message, {
      parse_mode: 'MarkdownV2',
      reply_markup: keyboard,
      link_preview_options: { is_disabled: true },
    });
  }

  async start(): Promise<void> {
    console.log('[Telegram] 🤖 HUNTER бот стартиран!');
    await this.bot.start();
  }

  async stop(): Promise<void> {
    await this.bot.stop();
    console.log('[Telegram] 🛑 HUNTER бот спрян.');
  }

  getBot(): Bot {
    return this.bot;
  }
}

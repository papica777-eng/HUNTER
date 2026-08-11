"use strict";
// ═══════════════════════════════════════════════════════════════════════
// === TelegramBot — VIP Channel Alert System ===
// ═══════════════════════════════════════════════════════════════════════
// Uses grammy library for Telegram Bot API.
// Sends deal alerts to VIP channel with inline "View Listing" button.
// Handles /start, /stats, /deals commands for subscribers.
// Complexity: O(1) per message send
// Entropy: 0.0000
Object.defineProperty(exports, "__esModule", { value: true });
exports.LovetsBot = void 0;
const grammy_1 = require("grammy");
const PriceAnalyzer_1 = require("../analysis/PriceAnalyzer");
class LovetsBot {
    bot;
    channelId;
    store;
    sentCount = 0;
    constructor(token, channelId, store) {
        this.bot = new grammy_1.Bot(token);
        this.channelId = channelId;
        this.store = store;
        this.setupCommands();
    }
    setupCommands() {
        // /start — Welcome message
        this.bot.command('start', async (ctx) => {
            await ctx.reply(`🎯 *ЛОВЕЦ — VIP Бот за Бързи Обяви*\n\n` +
                `Получавай мигновени известия при обяви под пазарната цена в:\n` +
                `🟢 OLX\\.bg\n` +
                `🚗 Mobile\\.bg\n` +
                `🏠 Imot\\.bg\n\n` +
                `📊 Команди:\n` +
                `/stats — Статистика на бота\n` +
                `/deals — Последните 10 сделки\n` +
                `/help — Помощ\n\n` +
                `💰 VIP достъп: 29 лв/мес\n` +
                `📩 За абонамент: @papica777`, { parse_mode: 'MarkdownV2' });
        });
        // /stats — Bot statistics
        this.bot.command('stats', async (ctx) => {
            const totalListings = this.store.count();
            await ctx.reply(`📊 *Статистика на ЛОВЕЦ*\n\n` +
                `📦 Общо обяви в базата: ${totalListings}\n` +
                `🔔 Изпратени известия: ${this.sentCount}\n` +
                `⏱ Сканиране на всеки: ${process.env.SCAN_INTERVAL_SECONDS || '10'} секунди\n` +
                `🎯 Праг за отстъпка: ${process.env.PRICE_DISCOUNT_THRESHOLD || '20'}%`, { parse_mode: 'MarkdownV2' });
        });
        // /deals — Recent deals
        this.bot.command('deals', async (ctx) => {
            const threshold = parseInt(process.env.PRICE_DISCOUNT_THRESHOLD || '20', 10);
            const deals = this.store.getRecentDeals(threshold, 10);
            if (deals.length === 0) {
                await ctx.reply('🔍 Няма намерени сделки под прага. Ботът продължава да сканира...');
                return;
            }
            for (const deal of deals.slice(0, 5)) {
                await this.sendDealToChat(ctx, deal);
                // Small delay between messages to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        });
        // /help
        this.bot.command('help', async (ctx) => {
            await ctx.reply(`🎯 *ЛОВЕЦ — Как работи?*\n\n` +
                `1\\. Ботът сканира OLX, Mobile\\.bg и Imot\\.bg на всеки 10 секунди\\.\n` +
                `2\\. Сравнява цената с пазарната средна\\.\n` +
                `3\\. Ако обявата е 20%\\+ ПОД средната — получаваш мигновено известие\\.\n` +
                `4\\. Натискаш бутона "Виж обявата" и се свързваш с продавача ПРЕДИ другите\\.\n\n` +
                `📩 За VIP достъп: @papica777`, { parse_mode: 'MarkdownV2' });
        });
    }
    /**
     * Send a deal alert to the VIP channel.
     * Includes inline button "Виж обявата" → opens listing URL.
     */
    async sendDealAlert(listing) {
        try {
            const message = PriceAnalyzer_1.PriceAnalyzer.formatDealMessage(listing);
            const keyboard = new grammy_1.InlineKeyboard()
                .url('🔗 Виж обявата', listing.url);
            if (listing.image_url) {
                try {
                    await this.bot.api.sendPhoto(this.channelId, listing.image_url, {
                        caption: message,
                        parse_mode: 'MarkdownV2',
                        reply_markup: keyboard,
                    });
                }
                catch {
                    // If image fails, send text only
                    await this.bot.api.sendMessage(this.channelId, message, {
                        parse_mode: 'MarkdownV2',
                        reply_markup: keyboard,
                        link_preview_options: { is_disabled: true },
                    });
                }
            }
            else {
                await this.bot.api.sendMessage(this.channelId, message, {
                    parse_mode: 'MarkdownV2',
                    reply_markup: keyboard,
                    link_preview_options: { is_disabled: true },
                });
            }
            this.store.markNotified(listing.source, listing.id);
            this.sentCount++;
            console.log(`[Telegram] ✅ Изпратено: ${listing.title} (${listing.price_display})`);
        }
        catch (error) {
            console.error(`[Telegram] ❌ Грешка при изпращане: ${error?.message || error}`);
        }
    }
    /**
     * Send deal to a specific chat (for /deals command).
     */
    async sendDealToChat(ctx, listing) {
        const message = PriceAnalyzer_1.PriceAnalyzer.formatDealMessage(listing);
        const keyboard = new grammy_1.InlineKeyboard().url('🔗 Виж обявата', listing.url);
        await ctx.reply(message, {
            parse_mode: 'MarkdownV2',
            reply_markup: keyboard,
            link_preview_options: { is_disabled: true },
        });
    }
    /**
     * Start the bot (long polling).
     */
    async start() {
        console.log('[Telegram] 🤖 ЛОВЕЦ бот стартиран!');
        await this.bot.start();
    }
    /**
     * Stop the bot gracefully.
     */
    async stop() {
        await this.bot.stop();
        console.log('[Telegram] 🛑 ЛОВЕЦ бот спрян.');
    }
    getBot() {
        return this.bot;
    }
}
exports.LovetsBot = LovetsBot;
//# sourceMappingURL=TelegramBot.js.map
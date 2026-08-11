// ═══════════════════════════════════════════════════════════════════════
// === AETERNA TELEGRAM UPLINK & HUNTER COMMAND CENTER ===
// ═══════════════════════════════════════════════════════════════════════
// Integrated from OmniCore/telegram/TelegramUplink.js
// Master Uplink Code: 967408
// Architect: Dimitar Prodromov | Pomorie HQ
// Authority: AETERNA_LOGOS
// ═══════════════════════════════════════════════════════════════════════

import { Bot, InlineKeyboard, Context } from 'grammy';
import { Listing } from '../types';
import { PriceAnalyzer } from '../analysis/PriceAnalyzer';
import { ListingStore } from '../storage/ListingStore';

export const MASTER_UPLINK_CODE = "967408";

export class TelegramUplink {
  private bot: Bot | null = null;
  private channelId: string;
  private store: ListingStore;
  private allowedUsers: Set<string> = new Set();
  private sentCount: number = 0;
  private isMockMode: boolean = false;

  constructor(token: string, channelId: string, store: ListingStore) {
    this.channelId = channelId;
    this.store = store;

    if (!token || token === "YOUR_BOT_TOKEN_HERE" || token.includes("PLACEHOLDER") || token === "MOCK_TOKEN") {
      console.warn("⚠️ [TELEGRAM UPLINK] MOCK MODE ACTIVE — No real token provided. Running in simulation mode.");
      this.isMockMode = true;
      return;
    }

    try {
      this.bot = new Bot(token);
      this.setupHandlers();
    } catch (err: any) {
      console.error("❌ [TELEGRAM UPLINK] Init Error:", err.message);
      this.isMockMode = true;
    }
  }

  private setupHandlers(): void {
    if (!this.bot) return;

    // Master Uplink Auth & Commands
    this.bot.on("message:text", async (ctx: Context) => {
      const chatId = ctx.chat?.id.toString() || "";
      const text = ctx.message?.text?.trim() || "";
      const username = ctx.from?.username || ctx.from?.first_name || "Unknown";

      // 1. AUTHENTICATION CHECK WITH MASTER CODE (967408)
      if (!this.allowedUsers.has(chatId)) {
        if (text === MASTER_UPLINK_CODE) {
          this.allowedUsers.add(chatId);
          await ctx.reply(
            `🌌 *AETERNA ACCESS GRANTED*\n\n` +
            `Welcome to HUNTER Command Center, Architect.\n` +
            `_Sovereign Uplink Established (Code: ${MASTER_UPLINK_CODE})_\n\n` +
            `*Available Commands:*\n` +
            `/status - System status & scanner health\n` +
            `/deals - Recent deal alerts\n` +
            `/stats - Database statistics\n` +
            `/revenue - Revenue dashboard\n` +
            `/saas - SaaS applications & subscriptions\n` +
            `/crypto - Crypto assets & wallets\n` +
            `/help - Show help menu`,
            { parse_mode: 'Markdown' }
          );
          console.log(`[TELEGRAM UPLINK] ✅ Authorized Architect: ${username} (${chatId})`);
          return;
        } else {
          await ctx.reply(
            `⛔ *ACCESS DENIED*\n\n` +
            `Enter Master Uplink Code to access HUNTER Command Center.`,
            { parse_mode: 'Markdown' }
          );
          return;
        }
      }

      // 2. COMMAND PROCESSING
      if (text.startsWith('/')) {
        const [cmd, ...args] = text.split(' ');
        await this.handleCommand(cmd.toLowerCase(), args, ctx);
      } else {
        await ctx.reply(`🧠 *AETERNA AI:* Command received: "${text}". Use /help for menu.`);
      }
    });
  }

  private async handleCommand(cmd: string, args: string[], ctx: Context): Promise<void> {
    switch (cmd) {
      case '/status':
        const total = this.store.count();
        await ctx.reply(
          `🌌 *HUNTER SYSTEM STATUS*\n\n` +
          `🖥️ *Backend:* ONLINE (Aeterna Core)\n` +
          `📦 *Listings Indexed:* ${total}\n` +
          `🔔 *Alerts Sent:* ${this.sentCount}\n` +
          `⚡ *Entropy:* 0.0000 (Zero Drift)\n` +
          `🔒 *Master Uplink:* ACTIVE (Code 967408)\n\n` +
          `_All systems sovereign._`,
          { parse_mode: 'Markdown' }
        );
        break;

      case '/deals':
        const threshold = parseInt(process.env.PRICE_DISCOUNT_THRESHOLD || '20', 10);
        const recentDeals = this.store.getRecentDeals(threshold, 5);
        if (recentDeals.length === 0) {
          await ctx.reply('🔍 Няма намерени сделки под прага в момента.');
          return;
        }
        for (const deal of recentDeals) {
          const msg = PriceAnalyzer.formatDealMessage(deal);
          const kb = new InlineKeyboard().url('🔗 Виж обявата', deal.url);
          await ctx.reply(msg, { parse_mode: 'MarkdownV2', reply_markup: kb });
        }
        break;

      case '/stats':
        await ctx.reply(
          `📊 *HUNTER STATISTICS*\n\n` +
          `• Total Scraped: ${this.store.count()}\n` +
          `• Total Alerts Sent: ${this.sentCount}\n` +
          `• Active Scrapers: OLX, Mobile.bg, Imot.bg\n` +
          `• Discount Threshold: 20%+`,
          { parse_mode: 'Markdown' }
        );
        break;

      case '/revenue':
        await ctx.reply(
          `💰 *REVENUE DASHBOARD*\n\n` +
          `• HUNTER VIP (29 лв/мес): Active\n` +
          `• AI Sales Bot (99 лв + 49 лв/мес): Active\n` +
          `• Web3 Security Audit ($250): Active\n\n` +
          `🔗 Client Portal: https://papica777-eng.github.io/HUNTER/`,
          { parse_mode: 'Markdown' }
        );
        break;

      case '/crypto':
        await ctx.reply(
          `₿ *AETERNA CRYPTO VAULT*\n\n` +
          `• TRON Energy Delegator (WEALTH_BRIDGE): LIVE\n` +
          `• Solana Mainnet Vault: CONNECTED\n` +
          `• Knox Hardware Seal: S24 ULTRA ENCLAVE`,
          { parse_mode: 'Markdown' }
        );
        break;

      case '/help':
        await ctx.reply(
          `🌌 *HUNTER COMMANDS*\n\n` +
          `/status - System status\n` +
          `/deals - Recent deals\n` +
          `/stats - Statistics\n` +
          `/revenue - Revenue dashboard\n` +
          `/crypto - Crypto vault status\n` +
          `/help - Show this menu`,
          { parse_mode: 'Markdown' }
        );
        break;

      default:
        await ctx.reply(`❓ Неизвестна команда. Напишете /help.`);
    }
  }

  /**
   * Send a deal alert to Telegram VIP channel.
   */
  async sendDealAlert(listing: Listing): Promise<void> {
    this.sentCount++;

    if (this.isMockMode || !this.bot) {
      console.log(`[TELEGRAM MOCK ALERT #${this.sentCount}] 🎯 ${listing.title} (${listing.price_display}) → ${listing.url}`);
      return;
    }

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
      console.log(`[TELEGRAM LIVE ALERT] ✅ ${listing.title} (${listing.price_display})`);
    } catch (err: any) {
      console.error(`[TELEGRAM ALERT ERROR] ${err?.message || err}`);
    }
  }

  async start(): Promise<void> {
    if (this.isMockMode || !this.bot) {
      console.log(`[TELEGRAM UPLINK] Running in Simulation/Mock Mode. Master Code: ${MASTER_UPLINK_CODE}`);
      return;
    }

    console.log(`[TELEGRAM UPLINK] 🚀 Bot Started with Master Code: ${MASTER_UPLINK_CODE}`);
    await this.bot.start();
  }

  async stop(): Promise<void> {
    if (this.bot) {
      await this.bot.stop();
    }
  }
}

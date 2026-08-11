import { Bot } from 'grammy';
import { Listing } from '../types';
import { ListingStore } from '../storage/ListingStore';
export declare class LovetsBot {
    private bot;
    private channelId;
    private store;
    private sentCount;
    constructor(token: string, channelId: string, store: ListingStore);
    private setupCommands;
    /**
     * Send a deal alert to the VIP channel.
     * Includes inline button "Виж обявата" → opens listing URL.
     */
    sendDealAlert(listing: Listing): Promise<void>;
    /**
     * Send deal to a specific chat (for /deals command).
     */
    private sendDealToChat;
    /**
     * Start the bot (long polling).
     */
    start(): Promise<void>;
    /**
     * Stop the bot gracefully.
     */
    stop(): Promise<void>;
    getBot(): Bot;
}
//# sourceMappingURL=TelegramBot.d.ts.map
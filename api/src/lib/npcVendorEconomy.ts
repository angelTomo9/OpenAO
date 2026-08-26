/**
 * Dynamic NPC Vendor Supply & Demand Economy Engine for OpenAO MMORPG.
 * Simulates price elasticity based on local stock scarcity and server-tick restocking.
 */

export interface VendorItemEntry {
    itemId: string;
    basePrice: number;
    currentStock: number;
    targetStock: number; // The equilibrium stock size
    priceVolatilityExponent: number; // e.g., 0.5 for square root scaling, 1.0 for linear
    restockRatePerTick: number; // Units restocked (or decayed) towards targetStock per tick
}

export interface NpcVendorState {
    vendorId: string;
    inventory: Map<string, VendorItemEntry>;
}

export class NpcEconomyEngine {
    /**
     * Calculates the current dynamic price of a single unit of the item based on supply scarcity.
     * Price inflates when currentStock < targetStock.
     * Price deflates when currentStock > targetStock.
     */
    public static calculateUnitBuyPrice(item: VendorItemEntry): number {
        // Prevent division by zero and extreme asymptotics by adding 1 to stocks
        const supplyRatio = (item.targetStock + 1) / (item.currentStock + 1);
        const modifier = Math.pow(supplyRatio, item.priceVolatilityExponent);
        const rawPrice = item.basePrice * modifier;
        
        return Math.max(1, Math.ceil(rawPrice));
    }

    /**
     * Sells price is typically lower than buy price to prevent infinite arbitrage.
     * We apply a 60% standard vendor markdown on top of the dynamic price.
     */
    public static calculateUnitSellPrice(item: VendorItemEntry): number {
        const buyPrice = this.calculateUnitBuyPrice(item);
        return Math.max(1, Math.floor(buyPrice * 0.60));
    }

    /**
     * Executes a player purchase from the vendor.
     */
    public static executePlayerPurchase(vendor: NpcVendorState, itemId: string, quantity: number): { success: boolean; totalCost: number; reason?: string } {
        const item = vendor.inventory.get(itemId);
        if (!item) return { success: false, totalCost: 0, reason: "Item not sold by this vendor" };

        if (item.currentStock < quantity) {
            return { success: false, totalCost: 0, reason: "Vendor out of stock" };
        }

        let totalCost = 0;
        // Calculate cost per unit sequentially because the price inflates with each unit purchased
        for (let i = 0; i < quantity; i++) {
            totalCost += this.calculateUnitBuyPrice(item);
            item.currentStock -= 1;
        }

        return { success: true, totalCost };
    }

    /**
     * Executes a player sale to the vendor.
     */
    public static executePlayerSale(vendor: NpcVendorState, itemId: string, quantity: number): { success: boolean; totalPayout: number; reason?: string } {
        const item = vendor.inventory.get(itemId);
        if (!item) return { success: false, totalPayout: 0, reason: "Vendor does not buy this item" };

        let totalPayout = 0;
        // Calculate payout sequentially because price deflates with each unit sold to the vendor
        for (let i = 0; i < quantity; i++) {
            totalPayout += this.calculateUnitSellPrice(item);
            item.currentStock += 1;
        }

        return { success: true, totalPayout };
    }

    /**
     * Progresses the server economy tick, pushing current stock towards target equilibrium.
     */
    public static tickRestock(vendor: NpcVendorState): void {
        for (const item of vendor.inventory.values()) {
            if (item.currentStock < item.targetStock) {
                item.currentStock = Math.min(item.targetStock, item.currentStock + item.restockRatePerTick);
            } else if (item.currentStock > item.targetStock) {
                item.currentStock = Math.max(item.targetStock, item.currentStock - item.restockRatePerTick);
            }
        }
    }
}
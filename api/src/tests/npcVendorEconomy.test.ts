import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { NpcEconomyEngine, NpcVendorState, VendorItemEntry } from "../lib/npcVendorEconomy.js";

describe("Dynamic NPC Vendor Economy", () => {
    const createMockVendor = (): NpcVendorState => {
        const potion: VendorItemEntry = {
            itemId: "health_potion_01",
            basePrice: 50,
            currentStock: 100,
            targetStock: 100,
            priceVolatilityExponent: 0.5,
            restockRatePerTick: 5,
        };
        const vendor = { vendorId: "vendor_city_01", inventory: new Map() };
        vendor.inventory.set("health_potion_01", potion);
        return vendor;
    };

    it("inflates price when stock is scarce (bought out by players)", () => {
        const vendor = createMockVendor();
        const item = vendor.inventory.get("health_potion_01")!;
        
        const basePrice = NpcEconomyEngine.calculateUnitBuyPrice(item);
        assert.equal(basePrice, 50);

        // Player buys 90 potions, leaving only 10 in stock
        const res = NpcEconomyEngine.executePlayerPurchase(vendor, "health_potion_01", 90);
        assert.equal(res.success, true);
        assert.equal(item.currentStock, 10);

        // Price should be inflated due to scarcity (target=100, current=10)
        const inflatedPrice = NpcEconomyEngine.calculateUnitBuyPrice(item);
        assert.ok(inflatedPrice > 100); // Should be significantly higher than 50
    });

    it("deflates price when stock is oversupplied (dumped by players)", () => {
        const vendor = createMockVendor();
        const item = vendor.inventory.get("health_potion_01")!;

        // Player dumps 300 potions into the vendor
        const res = NpcEconomyEngine.executePlayerSale(vendor, "health_potion_01", 300);
        assert.equal(res.success, true);
        assert.equal(item.currentStock, 400);

        // Price should be deflated due to massive oversupply
        const deflatedBuyPrice = NpcEconomyEngine.calculateUnitBuyPrice(item);
        assert.ok(deflatedBuyPrice < 30); // Should be lower than 50
    });

    it("gradually restocks and recovers toward equilibrium over server ticks", () => {
        const vendor = createMockVendor();
        const item = vendor.inventory.get("health_potion_01")!;

        // Exhaust stock to 0
        NpcEconomyEngine.executePlayerPurchase(vendor, "health_potion_01", 100);
        assert.equal(item.currentStock, 0);

        // Tick 1: Should recover by restock rate (5)
        NpcEconomyEngine.tickRestock(vendor);
        assert.equal(item.currentStock, 5);

        // Tick 2: Should recover to 10
        NpcEconomyEngine.tickRestock(vendor);
        assert.equal(item.currentStock, 10);
    });
});
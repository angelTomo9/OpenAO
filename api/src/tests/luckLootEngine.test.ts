import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { LuckLootEngine, LootTableEntry } from "../lib/luckLootEngine.js";

describe("LuckLootEngine Loot Distribution & Weight Skewing", () => {
    const mockLootTable: LootTableEntry[] = [
        { itemId: "junk_bone", rarity: "COMMON", baseWeight: 1000 },
        { itemId: "iron_sword", rarity: "UNCOMMON", baseWeight: 250 },
        { itemId: "sapphire_gem", rarity: "RARE", baseWeight: 50 },
        { itemId: "dragon_scale", rarity: "EPIC", baseWeight: 10 },
        { itemId: "excalibur", rarity: "LEGENDARY", baseWeight: 1 },
    ];

    it("suppresses COMMON weights and boosts LEGENDARY weights with high luck", () => {
        const skewed = LuckLootEngine.calculateSkewedWeights(mockLootTable, 100); // 100 Luck

        const commonEntry = skewed.find(s => s.item.rarity === "COMMON")!;
        const legEntry = skewed.find(s => s.item.rarity === "LEGENDARY")!;

        // Base common is 1000. At 100 luck, mod is 1.0 - (100/200) = 0.5. Result: 500
        assert.equal(commonEntry.skewedWeight, 500);

        // Base leg is 1. At 100 luck, mod is 1.0 + (100/25) = 5.0. Result: 5
        assert.equal(legEntry.skewedWeight, 5);
    });

    it("rolls an item using the weighted distribution", () => {
        // With 0 luck, roll near 0 gives COMMON, roll at max gives LEGENDARY
        const commonDrop = LuckLootEngine.rollLootDrop(mockLootTable, 0, () => 0.01);
        assert.equal(commonDrop?.rarity, "COMMON");

        // Force roll to the very end of the weight pool (sum is 1311, so 0.999 * 1311 ~ 1309.6)
        const legendaryDrop = LuckLootEngine.rollLootDrop(mockLootTable, 0, () => 0.9999);
        assert.equal(legendaryDrop?.rarity, "LEGENDARY");
    });
});
import { describe, it, expect } from "vitest";
import { ItemDurabilityEngine, ItemDurabilityState } from "../lib/itemDurability.js";

describe("ItemDurabilityEngine Refined Wear & Blacksmith Gold Gating", () => {
    const sword: ItemDurabilityState = {
        itemId: "silver_broadsword_01",
        name: "Silver Broadsword",
        slot: "WEAPON_MAIN",
        currentDurability: 50,
        maxDurability: 50,
        baseValueGold: 1000,
        baseAttackOrDefense: 35,
        isBroken: false,
    };

    it("applies durability loss and breaks at zero durability", () => {
        const item = { ...sword, currentDurability: 1 };
        const res = ItemDurabilityEngine.applyWear(item, 0.5, { rng: () => 0.1 });

        expect(res.isNowBroken).toBe(true);
        expect(item.currentDurability).toBe(0);
        expect(ItemDurabilityEngine.getEffectiveStat(item)).toBe(0);
    });

    it("rejects repair when player lacks sufficient gold", () => {
        const damagedItem: ItemDurabilityState = {
            ...sword,
            currentDurability: 25, // Missing 50% = 200 gold cost
            isBroken: false,
        };

        const repairRes = ItemDurabilityEngine.repairItem(damagedItem, 50); // Only 50 gold available

        expect(repairRes.success).toBe(false);
        expect(repairRes.goldCost).toBe(200);
        expect(damagedItem.currentDurability).toBe(25); // Durability remains unchanged
    });

    it("successfully repairs item and deducts gold when funds are sufficient", () => {
        const damagedItem: ItemDurabilityState = {
            ...sword,
            currentDurability: 25,
            isBroken: true,
        };

        const repairRes = ItemDurabilityEngine.repairItem(damagedItem, 500);

        expect(repairRes.success).toBe(true);
        expect(repairRes.goldCost).toBe(200);
        expect(repairRes.remainingGold).toBe(300);
        expect(damagedItem.currentDurability).toBe(50);
        expect(damagedItem.isBroken).toBe(false);
    });
});
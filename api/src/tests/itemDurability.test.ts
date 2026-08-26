import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ItemDurabilityEngine, ItemDurabilityState } from "../lib/itemDurability.js";

describe("ItemDurabilityEngine Wear & Blacksmith Repair", () => {
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

    it("applies durability loss on weapon hit", () => {
        const item = { ...sword };
        const res = ItemDurabilityEngine.applyWear(item, 0.10, { rng: () => 0.05 }); // Rolled below chance

        assert.equal(res.durabilityLost, 1);
        assert.equal(item.currentDurability, 49);
        assert.equal(item.isBroken, false);
    });

    it("breaks item at zero durability, reducing effective combat stats to zero", () => {
        const item: ItemDurabilityState = { ...sword, currentDurability: 1 };
        const res = ItemDurabilityEngine.applyWear(item, 0.5, { rng: () => 0.1 });

        assert.equal(res.isNowBroken, true);
        assert.equal(item.currentDurability, 0);
        assert.equal(ItemDurabilityEngine.getEffectiveStat(item), 0);
    });

    it("calculates repair cost and restores item to pristine condition", () => {
        const damagedItem: ItemDurabilityState = {
            ...sword,
            currentDurability: 25, // 50% missing durability
            isBroken: false,
        };

        // 1000 gold * 50% * 0.40 factor = 200 gold
        const repairCost = ItemDurabilityEngine.calculateRepairCost(damagedItem);
        assert.equal(repairCost, 200);

        const repairRes = ItemDurabilityEngine.repairItem(damagedItem);
        assert.equal(repairRes.success, true);
        assert.equal(damagedItem.currentDurability, 50);
        assert.equal(damagedItem.isBroken, false);
        assert.equal(ItemDurabilityEngine.getEffectiveStat(damagedItem), 35);
    });
});
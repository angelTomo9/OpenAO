/**
 * Item Durability Degradation & Blacksmith Repair Engine for OpenAO MMORPG.
 * Simulates combat wear, broken item stat penalties, and dynamic repair gold costs.
 */

export type EquipmentSlot = "WEAPON_MAIN" | "WEAPON_OFFHAND" | "HELMET" | "CHEST_ARMOR" | "SHIELD";

export interface ItemDurabilityState {
    itemId: string;
    name: string;
    slot: EquipmentSlot;
    currentDurability: number;
    maxDurability: number;
    baseValueGold: number;
    baseAttackOrDefense: number;
    isBroken: boolean;
}

export interface DurabilityDegradeOptions {
    rng?: () => number; // Default Math.random
    isCriticalStrike?: boolean; // Critical hits cause extra wear
}

export class ItemDurabilityEngine {
    private static readonly REPAIR_COST_FACTOR = 0.40; // Full repair costs 40% of item's base gold value

    /**
     * Applies durability loss on physical combat action.
     */
    public static applyWear(
        item: ItemDurabilityState,
        wearChance: number, // 0.0 to 1.0 (e.g. 0.10 for weapon attack, 0.15 for armor block)
        options: DurabilityDegradeOptions = {}
    ): { durabilityLost: number; isNowBroken: boolean } {
        if (item.isBroken || item.currentDurability <= 0) {
            return { durabilityLost: 0, isNowBroken: true };
        }

        const rng = options.rng || Math.random;
        const chance = options.isCriticalStrike ? wearChance * 1.5 : wearChance;

        if (rng() <= chance) {
            const loss = options.isCriticalStrike ? 2 : 1;
            item.currentDurability = Math.max(0, item.currentDurability - loss);
            item.isBroken = item.currentDurability === 0;

            return {
                durabilityLost: loss,
                isNowBroken: item.isBroken,
            };
        }

        return { durabilityLost: 0, isNowBroken: false };
    }

    /**
     * Calculates the effective combat stat (attack power or armor defense) taking broken condition into account.
     */
    public static getEffectiveStat(item: ItemDurabilityState): number {
        if (item.isBroken || item.currentDurability <= 0) {
            return 0; // Broken items offer 0 bonus
        }
        return item.baseAttackOrDefense;
    }

    /**
     * Calculates the gold cost required to repair an item back to full durability.
     */
    public static calculateRepairCost(item: ItemDurabilityState): number {
        if (item.currentDurability >= item.maxDurability || item.maxDurability <= 0) {
            return 0;
        }

        const missingFraction = (item.maxDurability - item.currentDurability) / item.maxDurability;
        const cost = item.baseValueGold * missingFraction * this.REPAIR_COST_FACTOR;
        return Math.max(1, Math.ceil(cost));
    }

    /**
     * Repairs an item to max durability, clearing broken status.
     */
    public static repairItem(item: ItemDurabilityState): { success: boolean; goldCost: number } {
        const cost = this.calculateRepairCost(item);
        item.currentDurability = item.maxDurability;
        item.isBroken = false;

        return { success: true, goldCost: cost };
    }
}
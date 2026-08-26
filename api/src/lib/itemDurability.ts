/**
 * Item Durability Degradation & Blacksmith Repair Engine for OpenAO MMORPG.
 * Simulates combat wear, broken item stat penalties, and dynamic repair gold costs with payment gating.
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
    rng?: () => number;
    isCriticalStrike?: boolean;
}

export interface RepairItemResult {
    success: boolean;
    goldCost: number;
    remainingGold?: number;
    reason?: string;
}

export class ItemDurabilityEngine {
    private static readonly REPAIR_COST_FACTOR = 0.40;

    /**
     * Applies durability loss on physical combat action.
     */
    public static applyWear(
        item: ItemDurabilityState,
        wearChance: number,
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
     * Calculates the effective combat stat taking broken condition into account.
     */
    public static getEffectiveStat(item: ItemDurabilityState): number {
        if (item.isBroken || item.currentDurability <= 0) {
            return 0;
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
     * Repairs an item to max durability with player gold balance verification.
     */
    public static repairItem(item: ItemDurabilityState, availableGold: number): RepairItemResult {
        const cost = this.calculateRepairCost(item);

        if (cost === 0) {
            return {
                success: true,
                goldCost: 0,
                remainingGold: availableGold,
                reason: "Item is already at maximum durability",
            };
        }

        if (availableGold < cost) {
            return {
                success: false,
                goldCost: cost,
                reason: "Insufficient gold to repair item",
            };
        }

        item.currentDurability = item.maxDurability;
        item.isBroken = false;

        return {
            success: true,
            goldCost: cost,
            remainingGold: availableGold - cost,
        };
    }
}
/**
 * Arcane Disenchanting & Mystic Essence Extraction Forge Engine for OpenAO MMORPG.
 * Simulates the breakdown of enchanted weapons and armor into crafting essences,
 * scaling yields by item rarity tiers, enchanter skill proficiency, and critical extraction rolls.
 */

export type ItemRarityTier = "COMMON" | "MAGIC" | "RARE" | "EPIC" | "LEGENDARY";
export type EssenceType = "ARCANE_DUST" | "LESSER_MYSTIC_ESSENCE" | "GREATER_MYSTIC_ESSENCE" | "RADIANT_SHARD";

export interface DisenchantYield {
    essence: EssenceType;
    quantity: number;
    isCriticalBonus?: boolean;
}

export interface DisenchantableItem {
    itemId: string;
    itemTemplateId: string;
    rarity: ItemRarityTier;
    enchantmentPower: number; // e.g. +1 to +10
}

export interface DisenchantResult {
    success: boolean;
    yields: DisenchantYield[];
    totalDustEquivalent: number;
    wasCriticalExtraction: boolean;
    reason?: string;
}

export const RARITY_BASE_YIELDS: Record<ItemRarityTier, { dust: number; essence?: EssenceType; essenceQty: number }> = {
    COMMON: { dust: 2, essenceQty: 0 },
    MAGIC: { dust: 6, essence: "LESSER_MYSTIC_ESSENCE", essenceQty: 1 },
    RARE: { dust: 15, essence: "GREATER_MYSTIC_ESSENCE", essenceQty: 1 },
    EPIC: { dust: 35, essence: "GREATER_MYSTIC_ESSENCE", essenceQty: 3 },
    LEGENDARY: { dust: 80, essence: "RADIANT_SHARD", essenceQty: 2 },
};

export class EnchantmentDisenchantForgeEngine {
    /**
     * Disenchants an item into arcane components with skill scaling and critical bonus rolls.
     */
    public static disenchantItem(
        item: DisenchantableItem,
        playerEnchantingSkill: number,
        rng: () => number = Math.random
    ): DisenchantResult {
        const base = RARITY_BASE_YIELDS[item.rarity];
        if (!base) {
            return {
                success: false,
                yields: [],
                totalDustEquivalent: 0,
                wasCriticalExtraction: false,
                reason: "Invalid item rarity.",
            };
        }

        const skill = Math.min(100, Math.max(1, playerEnchantingSkill));

        // Skill scaling factor: 1.0 at skill 1 up to 1.50 at skill 100
        const skillFactor = 1.0 + (skill / 100) * 0.50;

        // Critical Extraction Chance: 5% base + 1% per 10 skill levels (max 15%)
        const criticalChance = 0.05 + skill / 1000;
        const wasCriticalExtraction = rng() < criticalChance;

        const critMultiplier = wasCriticalExtraction ? 2 : 1;
        const dustQty = Math.floor(base.dust * skillFactor * critMultiplier);

        const yields: DisenchantYield[] = [
            {
                essence: "ARCANE_DUST",
                quantity: dustQty,
                isCriticalBonus: wasCriticalExtraction,
            },
        ];

        if (base.essence && base.essenceQty > 0) {
            const essenceQty = Math.max(1, Math.floor(base.essenceQty * (wasCriticalExtraction ? 2 : 1)));
            yields.push({
                essence: base.essence,
                quantity: essenceQty,
                isCriticalBonus: wasCriticalExtraction,
            });
        }

        return {
            success: true,
            yields,
            totalDustEquivalent: dustQty,
            wasCriticalExtraction,
        };
    }
}
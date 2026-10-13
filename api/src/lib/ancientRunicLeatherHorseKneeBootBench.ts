import crypto from "node:crypto";

/**
 * Ancient Runic Leather Horse Knee Boot Bench, Mithril Knee Cup Rig & Celestial Valkyrie Knee Boot Sanctum Engine for OpenAO MMORPG.
 * Simulates equestrian knee boot, carpal joint and collateral ligament impact protection crafting benches (Elder Knee Boot Bench, Runic Oak Knee Boot Rig, Celestial Void Valkyrie Knee Boot Sanctum),
 * raw tanned ox carpal guards, tempered mithril knee cups and celestial void astral knee cores,
 * novice expedition, warmaster and sovereign valkyrie knee boot recipes,
 * steed carpal joint impact absorption ratings and patellar/collateral shielding ratings,
 * calibrated clamped knee boot stability bonuses,
 * upfront leather material deduction on all craft attempts, consistent remainingProvidedLeathers return shapes across all paths,
 * immutable bench cloning for safe rollbacks on both craft and maintain operations, cached static catalog maxima,
 * crypto-secure default gameplay rolls strictly in [0, 1), and horse knee boot bench maintenance routines.
 */

export type KneeBootBenchType = "ELDER_KNEE_BOOT_BENCH" | "RUNIC_OAK_KNEE_BOOT_RIG" | "CELESTIAL_VOID_VALKYRIE_KNEE_BOOT_SANCTUM";
export type RawLeatherKneeBootType = "TANNED_OX_CARPAL_GUARD" | "TEMPERED_MITHRIL_KNEE_CUP" | "CELESTIAL_VOID_ASTRAL_KNEE_CORE";
export type KneeBootRecipeType = "NOVICE_EXPEDITION_KNEE_BOOTS" | "WARMASTER_MITHRIL_KNEE_BOOTS" | "CELESTIAL_VOID_VALKYRIE_SOVEREIGN_KNEE_BOOTS";

export interface KneeBootBenchData {
    benchType: KneeBootBenchType;
    maxDurability: number;
    leathercraftPower: number;
    baseSuccessRatePercent: number; // 0 to 100
    kneeBootStabilityBonusPercent: number;
}

export interface KneeBootRecipeData {
    recipeType: KneeBootRecipeType;
    requiredLeatherType: RawLeatherKneeBootType;
    requiredLeatherCount: number;
    baseCarpalJointImpactAbsorptionPercent: number;
    basePatellarShieldingPercent: number;
}

export interface ActiveKneeBootBench {
    benchId: string;
    leatherworkerPlayerId: string;
    benchType: KneeBootBenchType;
    currentDurability: number;
    maxDurability: number;
    isFunctional: boolean;
}

export interface CraftedHorseKneeBoots {
    bootId: string;
    recipeType: KneeBootRecipeType;
    finalCarpalJointImpactAbsorptionPercent: number;
    finalPatellarShieldingPercent: number;
    bootStabilityPercent: number; // Scaled rating (clamped 0 to 100%, with catalog bench baselines ~16% to 100%)
    consumedLeatherCount: number;
    consumedLeatherType: RawLeatherKneeBootType;
    remainingProvidedLeathers: RawLeatherKneeBootType[];
    craftedEpochMs: number;
}

export const KNEE_BOOT_BENCH_CATALOG: Record<KneeBootBenchType, KneeBootBenchData> = {
    ELDER_KNEE_BOOT_BENCH: { benchType: "ELDER_KNEE_BOOT_BENCH", maxDurability: 100, leathercraftPower: 35, baseSuccessRatePercent: 88, kneeBootStabilityBonusPercent: 15 },
    RUNIC_OAK_KNEE_BOOT_RIG: { benchType: "RUNIC_OAK_KNEE_BOOT_RIG", maxDurability: 220, leathercraftPower: 80, baseSuccessRatePercent: 95, kneeBootStabilityBonusPercent: 25 },
    CELESTIAL_VOID_VALKYRIE_KNEE_BOOT_SANCTUM: { benchType: "CELESTIAL_VOID_VALKYRIE_KNEE_BOOT_SANCTUM", maxDurability: 380, leathercraftPower: 145, baseSuccessRatePercent: 99, kneeBootStabilityBonusPercent: 40 },
};

export const KNEE_BOOT_RECIPE_CATALOG: Record<KneeBootRecipeType, KneeBootRecipeData> = {
    NOVICE_EXPEDITION_KNEE_BOOTS: { recipeType: "NOVICE_EXPEDITION_KNEE_BOOTS", requiredLeatherType: "TANNED_OX_CARPAL_GUARD", requiredLeatherCount: 2, baseCarpalJointImpactAbsorptionPercent: 28, basePatellarShieldingPercent: 18 },
    WARMASTER_MITHRIL_KNEE_BOOTS: { recipeType: "WARMASTER_MITHRIL_KNEE_BOOTS", requiredLeatherType: "TEMPERED_MITHRIL_KNEE_CUP", requiredLeatherCount: 2, baseCarpalJointImpactAbsorptionPercent: 58, basePatellarShieldingPercent: 37 },
    CELESTIAL_VOID_VALKYRIE_SOVEREIGN_KNEE_BOOTS: { recipeType: "CELESTIAL_VOID_VALKYRIE_SOVEREIGN_KNEE_BOOTS", requiredLeatherType: "CELESTIAL_VOID_ASTRAL_KNEE_CORE", requiredLeatherCount: 2, baseCarpalJointImpactAbsorptionPercent: 89, basePatellarShieldingPercent: 68 },
};

export class AncientRunicLeatherHorseKneeBootBenchEngine {
    public static readonly DURABILITY_COST_PER_CRAFT = 10;

    /**
     * Cached static catalog maxima to prevent runtime array reallocation.
     */
    private static readonly MAX_BENCH_POWER = Math.max(...Object.values(KNEE_BOOT_BENCH_CATALOG).map(b => b.leathercraftPower));
    private static readonly MAX_BENCH_BONUS = Math.max(...Object.values(KNEE_BOOT_BENCH_CATALOG).map(b => b.kneeBootStabilityBonusPercent));

    /**
     * Constructs an active horse knee boot bench instance.
     */
    public static constructBench(leatherworkerPlayerId: string, benchType: KneeBootBenchType): ActiveKneeBootBench {
        const data = KNEE_BOOT_BENCH_CATALOG[benchType] ?? KNEE_BOOT_BENCH_CATALOG.ELDER_KNEE_BOOT_BENCH;
        return {
            benchId: `knee_boot_bench_${crypto.randomUUID()}`,
            leatherworkerPlayerId,
            benchType: data.benchType,
            currentDurability: data.maxDurability,
            maxDurability: data.maxDurability,
            isFunctional: true,
        };
    }

    /**
     * Safely samples a crypto-secure pseudorandom float strictly in [0, 1).
     */
    public static sampleSecureUnitRoll(): number {
        return crypto.randomInt(0, 1_000_000_000) / 1_000_000_000;
    }

    /**
     * Crafts horse knee boots with upfront material deduction and immutable bench cloning.
     */
    public static craftKneeBoots(
        bench: ActiveKneeBootBench,
        recipeType: KneeBootRecipeType,
        providedLeathers: RawLeatherKneeBootType[],
        craftRoll?: number,
        stabilityRoll?: number,
        currentEpochMs = Date.now()
    ): { success: boolean; boots?: CraftedHorseKneeBoots; updatedBench?: ActiveKneeBootBench; remainingDurability: number; remainingProvidedLeathers: RawLeatherKneeBootType[]; reason?: string } {
        const fallbackLeathers = Array.isArray(providedLeathers) ? [...providedLeathers] : [];

        if (!bench || !bench.isFunctional || bench.currentDurability < this.DURABILITY_COST_PER_CRAFT) {
            return {
                success: false,
                updatedBench: bench ? { ...bench } : undefined,
                remainingDurability: bench?.currentDurability ?? 0,
                remainingProvidedLeathers: fallbackLeathers,
                reason: `Horse knee boot bench is warped or lacks durability (requires ${this.DURABILITY_COST_PER_CRAFT}).`,
            };
        }

        const benchData = KNEE_BOOT_BENCH_CATALOG[bench.benchType];
        if (!benchData) {
            return { success: false, updatedBench: { ...bench }, remainingDurability: bench.currentDurability, remainingProvidedLeathers: fallbackLeathers, reason: `Unknown bench model: ${String(bench.benchType)}` };
        }

        const recipe = KNEE_BOOT_RECIPE_CATALOG[recipeType];
        if (!recipe) {
            return { success: false, updatedBench: { ...bench }, remainingDurability: bench.currentDurability, remainingProvidedLeathers: fallbackLeathers, reason: `Unknown horse knee boot recipe: ${String(recipeType)}` };
        }

        if (!Array.isArray(providedLeathers)) {
            return { success: false, updatedBench: { ...bench }, remainingDurability: bench.currentDurability, remainingProvidedLeathers: [], reason: "Invalid leathers array." };
        }

        // Count matching leather materials
        const matchingCount = providedLeathers.filter(l => l === recipe.requiredLeatherType).length;
        if (matchingCount < recipe.requiredLeatherCount) {
            return {
                success: false,
                updatedBench: { ...bench },
                remainingDurability: bench.currentDurability,
                remainingProvidedLeathers: fallbackLeathers,
                reason: `Insufficient knee boot materials: requires ${recipe.requiredLeatherCount}x ${recipe.requiredLeatherType}, provided ${matchingCount}.`,
            };
        }

        // Create updated bench clone
        const updatedBench = { ...bench };

        // Deduct durability on clone
        updatedBench.currentDurability -= this.DURABILITY_COST_PER_CRAFT;
        if (updatedBench.currentDurability < this.DURABILITY_COST_PER_CRAFT) {
            updatedBench.currentDurability = Math.max(0, updatedBench.currentDurability);
            updatedBench.isFunctional = false;
        }

        // Deduct materials upfront on all craft attempts
        const remainingProvidedLeathers: RawLeatherKneeBootType[] = [];
        let deducted = 0;
        for (const item of providedLeathers) {
            if (deducted < recipe.requiredLeatherCount && item === recipe.requiredLeatherType) {
                deducted++;
            } else {
                remainingProvidedLeathers.push(item);
            }
        }

        const safeCraftRoll = craftRoll !== undefined && Number.isFinite(craftRoll) ? Math.min(Math.max(craftRoll, 0), 1) : this.sampleSecureUnitRoll();
        const successThreshold = benchData.baseSuccessRatePercent / 100;

        if (safeCraftRoll > successThreshold) {
            return {
                success: false,
                updatedBench,
                remainingDurability: updatedBench.currentDurability,
                remainingProvidedLeathers,
                reason: `Carpal articulated joint warped during high-pressure stitching (roll ${safeCraftRoll.toFixed(4)} > threshold ${successThreshold.toFixed(4)}).`,
            };
        }

        const safeStabilityRoll = stabilityRoll !== undefined && Number.isFinite(stabilityRoll) ? Math.min(Math.max(stabilityRoll, 0), 1) : this.sampleSecureUnitRoll();
        const powerRatio = this.MAX_BENCH_POWER > 0 ? benchData.leathercraftPower / this.MAX_BENCH_POWER : 0;
        const stabilityBonusRatio = this.MAX_BENCH_BONUS > 0 ? benchData.kneeBootStabilityBonusPercent / this.MAX_BENCH_BONUS : 0;

        const stabilityBasePoints = safeStabilityRoll * 40;
        const powerBonusPoints = powerRatio * 40;
        const benchBonusPoints = stabilityBonusRatio * 20;
        const rawStabilityScore = stabilityBasePoints + powerBonusPoints + benchBonusPoints;
        const bootStabilityPercent = Math.min(100, Math.max(0, Math.round(rawStabilityScore)));

        const qualityMultiplier = 0.8 + (bootStabilityPercent / 100) * 0.4;
        const finalCarpalJointImpactAbsorptionPercent = Math.min(100, Math.max(0, Math.round(recipe.baseCarpalJointImpactAbsorptionPercent * qualityMultiplier)));
        const finalPatellarShieldingPercent = Math.min(100, Math.max(0, Math.round(recipe.basePatellarShieldingPercent * qualityMultiplier)));

        const boots: CraftedHorseKneeBoots = {
            bootId: `knee_boot_${crypto.randomUUID()}`,
            recipeType: recipe.recipeType,
            finalCarpalJointImpactAbsorptionPercent,
            finalPatellarShieldingPercent,
            bootStabilityPercent,
            consumedLeatherCount: recipe.requiredLeatherCount,
            consumedLeatherType: recipe.requiredLeatherType,
            remainingProvidedLeathers,
            craftedEpochMs: currentEpochMs,
        };

        return {
            success: true,
            boots,
            updatedBench,
            remainingDurability: updatedBench.currentDurability,
            remainingProvidedLeathers,
        };
    }

    /**
     * Maintains and repairs a horse knee boot bench instance.
     */
    public static maintainBench(bench: ActiveKneeBootBench, repairAmount: number): ActiveKneeBootBench {
        if (!bench) return bench;
        const updated = { ...bench };
        const safeAmount = Math.max(0, repairAmount);
        updated.currentDurability = Math.min(updated.maxDurability, updated.currentDurability + safeAmount);
        updated.isFunctional = updated.currentDurability >= this.DURABILITY_COST_PER_CRAFT;
        return updated;
    }
}

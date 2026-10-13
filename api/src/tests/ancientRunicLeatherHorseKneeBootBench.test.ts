import { describe, it, expect } from "vitest";
import { AncientRunicLeatherHorseKneeBootBenchEngine } from "../lib/ancientRunicLeatherHorseKneeBootBench";
import type { ActiveKneeBootBench } from "../lib/ancientRunicLeatherHorseKneeBootBench";

describe("AncientRunicLeatherHorseKneeBootBenchEngine Equestrian Knee Boots & Carpal Joint Protection Stitching Benches", () => {
    it("crafts Celestial Void Valkyrie Sovereign Knee Boots in Sanctum achieving 100% stability and returns remaining cores", () => {
        const bench = AncientRunicLeatherHorseKneeBootBenchEngine.constructBench("leather_01", "CELESTIAL_VOID_VALKYRIE_KNEE_BOOT_SANCTUM");
        expect(bench.benchType).toBe("CELESTIAL_VOID_VALKYRIE_KNEE_BOOT_SANCTUM");
        expect(bench.currentDurability).toBe(380);

        const initialLeathers = [
            "CELESTIAL_VOID_ASTRAL_KNEE_CORE",
            "CELESTIAL_VOID_ASTRAL_KNEE_CORE",
            "CELESTIAL_VOID_ASTRAL_KNEE_CORE"
        ] as any[];

        const craftRes = AncientRunicLeatherHorseKneeBootBenchEngine.craftKneeBoots(
            bench,
            "CELESTIAL_VOID_VALKYRIE_SOVEREIGN_KNEE_BOOTS",
            initialLeathers,
            0.1, // Success roll
            1.0, // Stability roll 1.0 -> 40 + 40 + 20 = 100%
            100000
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.boots?.recipeType).toBe("CELESTIAL_VOID_VALKYRIE_SOVEREIGN_KNEE_BOOTS");
        expect(craftRes.boots?.bootStabilityPercent).toBe(100);
        expect(craftRes.boots?.finalCarpalJointImpactAbsorptionPercent).toBe(100); // 89 * 1.20 = 106.8 -> clamped 100%
        expect(craftRes.boots?.finalPatellarShieldingPercent).toBe(82); // 68 * 1.20 = 81.6 -> 82%
        expect(craftRes.boots?.consumedLeatherCount).toBe(2);
        expect(craftRes.boots?.consumedLeatherType).toBe("CELESTIAL_VOID_ASTRAL_KNEE_CORE");
        expect(craftRes.boots?.remainingProvidedLeathers.length).toBe(1);
        expect(craftRes.remainingDurability).toBe(370); // 380 - 10
    });

    it("verifies mid-range stability roll and sub-100% quality scaling on Elder knee boot bench", () => {
        const bench = AncientRunicLeatherHorseKneeBootBenchEngine.constructBench("leather_mid", "ELDER_KNEE_BOOT_BENCH");
        const craftRes = AncientRunicLeatherHorseKneeBootBenchEngine.craftKneeBoots(
            bench,
            "NOVICE_EXPEDITION_KNEE_BOOTS",
            ["TANNED_OX_CARPAL_GUARD", "TANNED_OX_CARPAL_GUARD"],
            0.1,
            0.5
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.boots?.bootStabilityPercent).toBe(37);
        expect(craftRes.boots?.finalCarpalJointImpactAbsorptionPercent).toBe(27);
        expect(craftRes.boots?.finalPatellarShieldingPercent).toBe(17);
        expect(craftRes.remainingDurability).toBe(90); // 100 - 10
    });

    it("fails when craft roll exceeds threshold, deducting materials upfront and bench durability on clone", () => {
        const bench = AncientRunicLeatherHorseKneeBootBenchEngine.constructBench("leather_fail", "ELDER_KNEE_BOOT_BENCH");
        const initialDurability = bench.currentDurability;

        const craftRes = AncientRunicLeatherHorseKneeBootBenchEngine.craftKneeBoots(
            bench,
            "NOVICE_EXPEDITION_KNEE_BOOTS",
            ["TANNED_OX_CARPAL_GUARD", "TANNED_OX_CARPAL_GUARD", "TANNED_OX_CARPAL_GUARD"],
            0.99 // Fails (threshold is 0.88)
        );

        expect(craftRes.success).toBe(false);
        expect(craftRes.reason).toContain("Carpal articulated joint warped");
        expect(craftRes.remainingProvidedLeathers.length).toBe(1); // 3 provided - 2 deducted upfront = 1 remaining
        expect(craftRes.remainingDurability).toBe(initialDurability - 10);
        // Original bench remains untouched
        expect(bench.currentDurability).toBe(initialDurability);
    });

    it("rejects craft when required leather materials are insufficient without deducting durability", () => {
        const bench = AncientRunicLeatherHorseKneeBootBenchEngine.constructBench("leather_short", "RUNIC_OAK_KNEE_BOOT_RIG");
        const initialDurability = bench.currentDurability;

        const craftRes = AncientRunicLeatherHorseKneeBootBenchEngine.craftKneeBoots(
            bench,
            "WARMASTER_MITHRIL_KNEE_BOOTS",
            ["TEMPERED_MITHRIL_KNEE_CUP"] // Needs 2, only 1 provided
        );

        expect(craftRes.success).toBe(false);
        expect(craftRes.reason).toContain("Insufficient knee boot materials");
        expect(craftRes.remainingDurability).toBe(initialDurability);
        expect(craftRes.remainingProvidedLeathers.length).toBe(1);
    });

    it("rejects craft when bench durability is below cost and marks non-functional", () => {
        const brokenBench: ActiveKneeBootBench = {
            benchId: "broken_01",
            leatherworkerPlayerId: "player_x",
            benchType: "ELDER_KNEE_BOOT_BENCH",
            currentDurability: 5, // Below 10
            maxDurability: 100,
            isFunctional: false,
        };

        const craftRes = AncientRunicLeatherHorseKneeBootBenchEngine.craftKneeBoots(
            brokenBench,
            "NOVICE_EXPEDITION_KNEE_BOOTS",
            ["TANNED_OX_CARPAL_GUARD", "TANNED_OX_CARPAL_GUARD"]
        );

        expect(craftRes.success).toBe(false);
        expect(craftRes.reason).toContain("lacks durability");
        expect(craftRes.remainingDurability).toBe(5);
        expect(craftRes.remainingProvidedLeathers.length).toBe(2); // No materials deducted
    });

    it("maintains bench and restores durability and functional state", () => {
        const damagedBench: ActiveKneeBootBench = {
            benchId: "dmg_01",
            leatherworkerPlayerId: "player_y",
            benchType: "RUNIC_OAK_KNEE_BOOT_RIG",
            currentDurability: 0,
            maxDurability: 220,
            isFunctional: false,
        };

        const repaired = AncientRunicLeatherHorseKneeBootBenchEngine.maintainBench(damagedBench, 100);
        expect(repaired.currentDurability).toBe(100);
        expect(repaired.isFunctional).toBe(true);

        // Does not exceed max durability
        const overRepaired = AncientRunicLeatherHorseKneeBootBenchEngine.maintainBench(repaired, 500);
        expect(overRepaired.currentDurability).toBe(220);
    });

    it("defensively rejects invalid recipe, non-array leathers, or invalid bench models", () => {
        const bench = AncientRunicLeatherHorseKneeBootBenchEngine.constructBench("p_def", "ELDER_KNEE_BOOT_BENCH");

        const invalidRecipe = AncientRunicLeatherHorseKneeBootBenchEngine.craftKneeBoots(
            bench,
            "INVALID_RECIPE" as any,
            ["TANNED_OX_CARPAL_GUARD", "TANNED_OX_CARPAL_GUARD"]
        );
        expect(invalidRecipe.success).toBe(false);
        expect(invalidRecipe.reason).toContain("Unknown horse knee boot recipe");

        const invalidLeathers = AncientRunicLeatherHorseKneeBootBenchEngine.craftKneeBoots(
            bench,
            "NOVICE_EXPEDITION_KNEE_BOOTS",
            null as any
        );
        expect(invalidLeathers.success).toBe(false);
        expect(invalidLeathers.reason).toContain("Invalid leathers array");
    });
});

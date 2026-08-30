import { describe, it, expect } from "vitest";
import {
    AncientRunicEnchantingDisenchantingEngine,
    ActiveEnchantingAltar,
} from "../lib/ancientRunicEnchantingDisenchanting.js";

describe("AncientRunicEnchantingDisenchantingEngine Imbuing & Salvaging", () => {
    it("enchants Celestial Surge on Void Nexus Conduit achieving 100% quality and returns spliced reagents", () => {
        const altar = AncientRunicEnchantingDisenchantingEngine.attuneAltar("enchanter_01", "VOID_NEXUS_CONDUIT", 100000);
        expect(altar.altarType).toBe("VOID_NEXUS_CONDUIT");
        expect(altar.currentDurability).toBe(320);

        const initialReagents = [
            "VOID_CORE_FRAGMENT",
            "VOID_CORE_FRAGMENT",
            "VOID_CORE_FRAGMENT"
        ] as any[];

        const enchRes = AncientRunicEnchantingDisenchantingEngine.enchantItem(
            altar,
            "CELESTIAL_SURGE_IMBUING",
            initialReagents,
            0.1, // Success roll
            0.5, // Quality roll: 50 + 15 + 35 = 100%
            100000
        );

        expect(enchRes.success).toBe(true);
        expect(enchRes.result?.formulaType).toBe("CELESTIAL_SURGE_IMBUING");
        expect(enchRes.result?.imbuingQualityPercent).toBe(100);
        expect(enchRes.result?.finalStatValue).toBe(96); // 80 * 1.20 = 96 All Stats
        expect(enchRes.result?.consumedReagentCount).toBe(2);
        expect(enchRes.result?.consumedReagentType).toBe("VOID_CORE_FRAGMENT");
        expect(enchRes.result?.remainingReagents.length).toBe(1); // 3 - 2 = 1 left
        expect(enchRes.remainingDurability).toBe(308); // 320 - 12
    });

    it("disenchants Legendary gear into Void Core Fragments", () => {
        const altar = AncientRunicEnchantingDisenchantingEngine.attuneAltar("enchanter_02", "ASTRAL_CRYSTAL_ALTAR", 100000);

        const dis = AncientRunicEnchantingDisenchantingEngine.disenchantItem(altar, "LEGENDARY", 0.8, 100000);
        expect(dis.success).toBe(true);
        expect(dis.result?.salvagedReagent).toBe("VOID_CORE_FRAGMENT");
        expect(dis.result?.salvagedReagentCount).toBe(4);
        expect(dis.result?.purityQualityPercent).toBe(90); // 50 + 40 = 90%
        expect(dis.remainingDurability).toBe(168); // 180 - 12
    });

    it("rejects enchanting when insufficient reagents are provided", () => {
        const altar = AncientRunicEnchantingDisenchantingEngine.attuneAltar("enchanter_03", "NOVICE_ARCANE_TABLE", 100000);

        const failRes = AncientRunicEnchantingDisenchantingEngine.enchantItem(
            altar,
            "FIERY_BLADE_STRIKE",
            ["MYSTIC_DUST"]
        );

        expect(failRes.success).toBe(false);
        expect(failRes.reason).toContain("Insufficient reagents");
        expect(altar.currentDurability).toBe(80);
    });

    it("handles enchantment fizzle failure roll consuming durability", () => {
        const altar = AncientRunicEnchantingDisenchantingEngine.attuneAltar("enchanter_04", "NOVICE_ARCANE_TABLE", 100000); // 85% success

        const fizzle = AncientRunicEnchantingDisenchantingEngine.enchantItem(
            altar,
            "FIERY_BLADE_STRIKE",
            ["MYSTIC_DUST", "MYSTIC_DUST"],
            0.95
        );

        expect(fizzle.success).toBe(false);
        expect(fizzle.reason).toContain("fizzled");
        expect(altar.currentDurability).toBe(68); // 80 - 12
    });

    it("recharges altar and restores attunement", () => {
        const altar = AncientRunicEnchantingDisenchantingEngine.attuneAltar("enchanter_05", "NOVICE_ARCANE_TABLE", 100000);
        altar.currentDurability = 0;
        altar.isAttuned = false;

        const rep = AncientRunicEnchantingDisenchantingEngine.rechargeAltar(altar, 60);
        expect(rep.success).toBe(true);
        expect(rep.newDurability).toBe(60);
        expect(rep.isAttuned).toBe(true);
    });

    it("guards against null inputs and unsupported altar models", () => {
        expect(() => AncientRunicEnchantingDisenchantingEngine.attuneAltar("e", "CAULDRON" as any)).toThrow(
            "Unsupported altar type"
        );

        expect(AncientRunicEnchantingDisenchantingEngine.enchantItem(null as any, "FIERY_BLADE_STRIKE", []).success).toBe(false);
        expect(AncientRunicEnchantingDisenchantingEngine.disenchantItem(null as any, "RARE").success).toBe(false);
        expect(AncientRunicEnchantingDisenchantingEngine.rechargeAltar(null as any).success).toBe(false);
    });
});
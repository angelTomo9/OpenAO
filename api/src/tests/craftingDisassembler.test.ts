import { describe, it, expect } from "vitest";
import { CraftingDisassemblerEngine, DisassembleItemParams } from "../lib/craftingDisassembler.js";

describe("CraftingDisassemblerEngine Salvage Recovery & Critical Yields", () => {
    it("salvages full durability item with high skill efficiency", () => {
        const params: DisassembleItemParams = {
            itemTemplateId: "iron_plate_armor",
            currentDurability: 100,
            maxDurability: 100,
            playerBlacksmithSkill: 80, // High skill (skill efficiency = 0.40 + 0.36 = 76%)
        };

        const res = CraftingDisassemblerEngine.disassembleItem(params, () => 0.99); // No critical
        expect(res.success).toBe(true);
        expect(res.salvageEfficiencyPercent).toBe(76);
        expect(res.wasCriticalSalvage).toBe(false);

        // 12 base * 76% = 9 iron ingots
        const iron = res.yields.find(y => y.material === "IRON_INGOT");
        expect(iron?.quantity).toBe(9);
    });

    it("awards rare bonus material on critical salvage roll", () => {
        const params: DisassembleItemParams = {
            itemTemplateId: "mithril_broadsword",
            currentDurability: 50,
            maxDurability: 50,
            playerBlacksmithSkill: 100,
        };

        const res = CraftingDisassemblerEngine.disassembleItem(params, () => 0.01); // Trigger critical
        expect(res.success).toBe(true);
        expect(res.wasCriticalSalvage).toBe(true);

        const dragonScale = res.yields.find(y => y.material === "DRAGON_SCALE");
        expect(dragonScale).toBeDefined();
        expect(dragonScale?.isCriticalBonus).toBe(true);
    });

    it("rejects salvage when player lacks required blacksmithing skill", () => {
        const params: DisassembleItemParams = {
            itemTemplateId: "mithril_broadsword", // Requires skill 45
            currentDurability: 50,
            maxDurability: 50,
            playerBlacksmithSkill: 20,
        };

        const res = CraftingDisassemblerEngine.disassembleItem(params);
        expect(res.success).toBe(false);
        expect(res.reason).toContain("Insufficient skill level");
    });
});
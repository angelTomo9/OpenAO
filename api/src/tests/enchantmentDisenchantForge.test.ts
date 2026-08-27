import { describe, it, expect } from "vitest";
import {
    EnchantmentDisenchantForgeEngine,
    DisenchantableItem,
} from "../lib/enchantmentDisenchantForge.js";

describe("EnchantmentDisenchantForgeEngine Essence Extraction & Skill Scaling", () => {
    it("disenchants RARE item with high skill efficiency", () => {
        const rareSword: DisenchantableItem = {
            itemId: "item_sword_99",
            itemTemplateId: "glowing_broadsword",
            rarity: "RARE",
            enchantmentPower: 3,
        };

        // Skill 100 -> skill factor 1.50 -> 15 base * 1.50 = 22 Arcane Dust
        const result = EnchantmentDisenchantForgeEngine.disenchantItem(rareSword, 100, () => 0.99); // No crit
        expect(result.success).toBe(true);
        expect(result.wasCriticalExtraction).toBe(false);

        const dust = result.yields.find((y) => y.essence === "ARCANE_DUST");
        expect(dust?.quantity).toBe(22);

        const essence = result.yields.find((y) => y.essence === "GREATER_MYSTIC_ESSENCE");
        expect(essence?.quantity).toBe(1);
    });

    it("doubles dust and essence on critical extraction roll", () => {
        const epicStaff: DisenchantableItem = {
            itemId: "item_staff_01",
            itemTemplateId: "archmage_staff",
            rarity: "EPIC",
            enchantmentPower: 5,
        };

        // Base 35 dust, 3 greater essences -> Crit roll (rng = 0.01)
        const result = EnchantmentDisenchantForgeEngine.disenchantItem(epicStaff, 50, () => 0.01);
        expect(result.success).toBe(true);
        expect(result.wasCriticalExtraction).toBe(true);

        const dust = result.yields.find((y) => y.essence === "ARCANE_DUST");
        expect(dust?.isCriticalBonus).toBe(true);
        expect(dust?.quantity).toBeGreaterThan(70);

        const essence = result.yields.find((y) => y.essence === "GREATER_MYSTIC_ESSENCE");
        expect(essence?.quantity).toBe(6); // 3 * 2
    });
});
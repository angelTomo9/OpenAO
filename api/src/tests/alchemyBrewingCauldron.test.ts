import { describe, it, expect } from "vitest";
import { AlchemyBrewingCauldronEngine } from "../lib/alchemyBrewingCauldron.js";

describe("AlchemyBrewingCauldronEngine Recipe Cooking & Purity Rating", () => {
    it("brews a PERFECT_ELIXIR under optimal stirring and temperature", () => {
        const session = AlchemyBrewingCauldronEngine.startSession("greater_mana_potion")!;
        expect(session).toBeDefined();

        AlchemyBrewingCauldronEngine.addIngredient(session, "moonflower_petal");
        AlchemyBrewingCauldronEngine.addIngredient(session, "silver_leaf");
        AlchemyBrewingCauldronEngine.addIngredient(session, "crystal_water");

        AlchemyBrewingCauldronEngine.adjustHeat(session, "OPTIMAL", 5);
        AlchemyBrewingCauldronEngine.stir(session, "CLOCKWISE", 3);

        const result = AlchemyBrewingCauldronEngine.finishBrew(session, 50);
        expect(result.success).toBe(true);
        expect(result.qualityTier).toBe("PERFECT_ELIXIR");
        expect(result.purityPercent).toBe(100);
        expect(result.resultItemTemplateId).toBe("potion_greater_mana");
    });

    it("ruins the brew into sludge if ingredients are missing or wrong", () => {
        const session = AlchemyBrewingCauldronEngine.startSession("greater_mana_potion")!;
        AlchemyBrewingCauldronEngine.addIngredient(session, "moonflower_petal"); // Missing other 2 items

        const result = AlchemyBrewingCauldronEngine.finishBrew(session, 50);
        expect(result.success).toBe(false);
        expect(result.qualityTier).toBe("RUINED_SLUDGE");
        expect(result.reason).toContain("Incorrect or missing ingredients");
    });

    it("downgrades purity if cauldron overheats and stirring direction is reversed", () => {
        const session = AlchemyBrewingCauldronEngine.startSession("greater_mana_potion")!;
        AlchemyBrewingCauldronEngine.addIngredient(session, "moonflower_petal");
        AlchemyBrewingCauldronEngine.addIngredient(session, "silver_leaf");
        AlchemyBrewingCauldronEngine.addIngredient(session, "crystal_water");

        // Overheat for 2 ticks (-30) + wrong direction (-25) -> purity 45% -> DILUTED_BREW
        AlchemyBrewingCauldronEngine.adjustHeat(session, "OVERHEATED", 2);
        AlchemyBrewingCauldronEngine.stir(session, "COUNTER_CLOCKWISE", 3);

        const result = AlchemyBrewingCauldronEngine.finishBrew(session, 50);
        expect(result.success).toBe(true);
        expect(result.qualityTier).toBe("DILUTED_BREW");
        expect(result.purityPercent).toBe(45);
    });
});
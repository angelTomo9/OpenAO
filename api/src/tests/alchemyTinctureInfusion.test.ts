import { describe, it, expect } from "vitest";
import {
    AlchemyTinctureInfusionEngine,
    InfusionFlaskSession,
    PlayerToxicityState,
} from "../lib/alchemyTinctureInfusion.js";

describe("AlchemyTinctureInfusionEngine Brewing, Potency & Toxicity Mechanics", () => {
    it("brews Tincture of Clarity in Moonwell Dew with high skill bonus", () => {
        const session: InfusionFlaskSession = {
            sessionId: "sess_01",
            recipeId: "tincture_of_clarity",
            solvent: "MOONWELL_DEW",
            herb: "STARLIGHT_LOTUS",
            steepDurationSeconds: 15, // Optimal
            alchemistSkill: 100,      // Max skill
            isBrewed: false,
        };

        const brewRes = AlchemyTinctureInfusionEngine.brewTincture(session);
        expect(brewRes.success).toBe(true);
        expect(brewRes.tincture?.isBurned).toBe(false);
        // Base 50 * 1.4 solvent * 1.0 time * 1.30 skill = 91% potency
        expect(brewRes.tincture?.potencyPercent).toBe(91);
        expect(brewRes.tincture?.toxicityPoints).toBe(15); // 10 base + 5 moonwell
    });

    it("penalizes over-steeped burned tinctures", () => {
        const burnedSession: InfusionFlaskSession = {
            sessionId: "sess_02",
            recipeId: "tincture_of_clarity",
            solvent: "SPRING_WATER",
            herb: "STARLIGHT_LOTUS",
            steepDurationSeconds: 40, // > 30s (2x optimal 15) -> Burned
            alchemistSkill: 20,
            isBrewed: false,
        };

        const res = AlchemyTinctureInfusionEngine.brewTincture(burnedSession);
        expect(res.success).toBe(true);
        expect(res.tincture?.isBurned).toBe(true);
        expect(res.tincture?.potencyPercent).toBeLessThan(15);
    });

    it("accumulates toxicity and triggers toxic shock at threshold", () => {
        const player: PlayerToxicityState = { playerId: "hero_1", currentToxicity: 85, isToxicShock: false };
        const toxicTincture = {
            tinctureId: "t_1",
            recipeId: "tincture_of_berserk",
            potencyPercent: 80,
            toxicityPoints: 25,
            isBurned: false,
        };

        // 85 + 25 = 110 (>= 100 threshold) -> Toxic shock
        const consumeRes = AlchemyTinctureInfusionEngine.consumeTincture(player, toxicTincture);
        expect(consumeRes.isToxicShock).toBe(true);
        expect(player.currentToxicity).toBe(110);
    });

    it("purges toxicity and clears toxic shock with antidote", () => {
        const player: PlayerToxicityState = { playerId: "hero_1", currentToxicity: 105, isToxicShock: true };

        const antidoteRes = AlchemyTinctureInfusionEngine.applyAntidote(player, 50);
        expect(antidoteRes.success).toBe(true);
        expect(antidoteRes.remainingToxicity).toBe(55);
        expect(antidoteRes.shockCleared).toBe(true);
        expect(player.isToxicShock).toBe(false);
    });

    it("guards defensively against herb mismatch and invalid sessions", () => {
        const mismatchSession: InfusionFlaskSession = {
            sessionId: "sess_03",
            recipeId: "tincture_of_clarity",
            solvent: "SPRING_WATER",
            herb: "NIGHTSHADE_PETAL", // Wrong herb
            steepDurationSeconds: 15,
            alchemistSkill: 50,
            isBrewed: false,
        };

        const res = AlchemyTinctureInfusionEngine.brewTincture(mismatchSession);
        expect(res.success).toBe(false);
        expect(res.reason).toContain("Mismatch herb");
    });
});
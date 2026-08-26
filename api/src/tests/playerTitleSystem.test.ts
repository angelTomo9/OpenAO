import { describe, it, expect } from "vitest";
import { PlayerTitleSystemEngine, PlayerAchievementStats } from "../lib/playerTitleSystem.js";

describe("PlayerTitleSystemEngine Achievement Unlocks & HUD Nameplates", () => {
    it("unlocks titles based on player achievement milestones", () => {
        const stats: PlayerAchievementStats = {
            dragonsSlain: 15,
            pvpRank: 10,
            fishingSkill: 50,
            dungeonsCompleted: 10,
            goldEarnedTotal: 50000,
        };

        const unlocked = PlayerTitleSystemEngine.resolveUnlockedTitles(stats);
        expect(unlocked).toContain("dragonbane");
        expect(unlocked).toContain("grand_inquisitor");
        expect(unlocked).not.toContain("master_angler");
    });

    it("formats player nameplates with prefix and suffix titles correctly", () => {
        // Prefix title
        const prefixName = PlayerTitleSystemEngine.formatNameplate("Arthur", "grand_inquisitor");
        expect(prefixName).toBe("[Grand Inquisitor] Arthur");

        // Suffix title
        const suffixName = PlayerTitleSystemEngine.formatNameplate("Arthur", "undying_champion");
        expect(suffixName).toBe("Arthur, the Undying");

        // No title
        const plainName = PlayerTitleSystemEngine.formatNameplate("Arthur");
        expect(plainName).toBe("Arthur");
    });

    it("returns passive stat perks associated with equipped title", () => {
        const perks = PlayerTitleSystemEngine.getActivePerks("dragonbane");
        expect(perks.bonusMaxHp).toBe(50);
        expect(perks.criticalStrikeChanceBonusPercent).toBe(2.0);
    });
});
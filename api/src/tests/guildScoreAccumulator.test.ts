import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { GuildScoreAccumulator } from "../lib/guildScoreAccumulator.js";

describe("GuildScoreAccumulator Seasonal Ranking", () => {
    it("computes points for PvP, boss clears, and donations", () => {
        const pvpPts = GuildScoreAccumulator.calculateEventPoints({ type: "PVP_ENEMY_GUILD_KILL" });
        assert.equal(pvpPts, 25);

        const bossPts = GuildScoreAccumulator.calculateEventPoints({
            type: "DUNGEON_BOSS_CLEAR",
            pointsMultiplier: 2.0, // Mythic boss
        });
        assert.equal(bossPts, 200);

        const donatePts = GuildScoreAccumulator.calculateEventPoints({
            type: "GOLD_VAULT_DONATION",
            goldAmount: 50000,
        });
        assert.equal(donatePts, 50); // 50,000 / 1000 = 50
    });

    it("evaluates guild tier brackets and unlocked member capacities", () => {
        const bronze = GuildScoreAccumulator.getTierForScore(500);
        assert.equal(bronze.tier, "BRONZE");
        assert.equal(bronze.maxMembers, 10);

        const gold = GuildScoreAccumulator.getTierForScore(6500);
        assert.equal(gold.tier, "GOLD");
        assert.equal(gold.maxMembers, 20);
        assert.equal(gold.experienceBonusPercent, 5);

        const gm = GuildScoreAccumulator.getTierForScore(40000);
        assert.equal(gm.tier, "GRANDMASTER");
        assert.equal(gm.maxMembers, 30);
        assert.equal(gm.hasExclusiveCastlePortal, true);
    });

    it("calculates seasonal decay soft reset", () => {
        const decayed = GuildScoreAccumulator.computeSeasonResetScore(10000, 0.50);
        assert.equal(decayed, 5000);
    });
});
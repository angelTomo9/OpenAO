import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { RegionalThreatEngine, ZoneConfiguration } from "../lib/regionalThreatEngine.js";

describe("RegionalThreatEngine Dynamic Zone Scaling", () => {
    const goblinCamp: ZoneConfiguration = {
        zoneId: "goblin_camp_01",
        baseLevel: 10,
        maxScalingLevel: 30,
        densityThresholdSoft: 5,
        densityThresholdHard: 20,
    };

    it("returns baseline stats for empty or sparsely populated zones", () => {
        const resEmpty = RegionalThreatEngine.evaluateZoneThreat(goblinCamp, []);
        assert.equal(resEmpty.scaledMonsterLevel, 10);
        assert.equal(resEmpty.monsterHealthMultiplier, 1.0);
        assert.equal(resEmpty.eliteSpawnChancePercent, 1.0);

        // 4 players (below soft threshold of 5)
        const players = [
            { playerId: "p1", level: 50 },
            { playerId: "p2", level: 50 },
            { playerId: "p3", level: 50 },
            { playerId: "p4", level: 50 },
        ];
        const resSparse = RegionalThreatEngine.evaluateZoneThreat(goblinCamp, players);
        assert.equal(resSparse.scaledMonsterLevel, 10);
        assert.equal(resSparse.isOvercrowded, false);
    });

    it("scales threat up when high-level players overcrowd a low-level zone", () => {
        // 12 players averaging level 30 (Hard threshold is 20, Soft is 5)
        // Crowd Factor: (12 - 5) / (20 - 5) = 7 / 15 = ~0.466
        // Level Factor: (30 - 10) / (30 - 10) = 1.0
        // Threat Intensity: (0.466 * 0.6) + (1.0 * 0.4) = ~0.28 + 0.4 = 0.68
        const players = Array.from({ length: 12 }).map((_, i) => ({
            playerId: `p${i}`,
            level: 30
        }));

        const res = RegionalThreatEngine.evaluateZoneThreat(goblinCamp, players);
        
        assert.ok(res.scaledMonsterLevel > 10);
        assert.ok(res.monsterHealthMultiplier > 1.0);
        assert.ok(res.eliteSpawnChancePercent > 1.0);
        assert.equal(res.isOvercrowded, false); // Crowd factor 0.466 < 0.5
    });

    it("reaches maximum threat cap when totally overrun by max level players", () => {
        // 25 players (exceeds hard threshold of 20) averaging level 50 (exceeds max scaling 30)
        const players = Array.from({ length: 25 }).map((_, i) => ({
            playerId: `p${i}`,
            level: 50
        }));

        const res = RegionalThreatEngine.evaluateZoneThreat(goblinCamp, players);
        
        assert.equal(res.scaledMonsterLevel, 30); // Capped at maxScalingLevel
        assert.equal(res.monsterHealthMultiplier, 3.0); // 1.0 + 2.0
        assert.equal(res.monsterDamageMultiplier, 2.0); // 1.0 + 1.0
        assert.equal(res.eliteSpawnChancePercent, 15.0); // 1.0 + 14.0
        assert.equal(res.isOvercrowded, true);
    });
});
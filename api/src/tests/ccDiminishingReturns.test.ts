import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DiminishingReturnsEngine } from "../lib/ccDiminishingReturns.js";

describe("Crowd Control Diminishing Returns Engine", () => {
    it("applies diminishing multipliers: 100%, 50%, 25%, Immune", () => {
        const engine = new DiminishingReturnsEngine();
        const baseDuration = 4000;
        const charId = "player_rogue_01";
        let time = 100000;

        // 1st Application: 100%
        const r1 = engine.applyCrowdControl(charId, "STUN", baseDuration, time);
        assert.equal(r1.effectiveDurationMs, 4000);
        assert.equal(r1.isImmune, false);
        assert.equal(r1.drTier, 1);

        // Advance time by 5 seconds (CC ended after 4s, 1s into the 15s reset window)
        time += 5000; 

        // 2nd Application: 50%
        const r2 = engine.applyCrowdControl(charId, "STUN", baseDuration, time);
        assert.equal(r2.effectiveDurationMs, 2000);
        assert.equal(r2.isImmune, false);
        assert.equal(r2.drTier, 2);

        // Advance time by 3 seconds (CC ended after 2s, 1s into reset window)
        time += 3000;

        // 3rd Application: 25%
        const r3 = engine.applyCrowdControl(charId, "STUN", baseDuration, time);
        assert.equal(r3.effectiveDurationMs, 1000);
        assert.equal(r3.isImmune, false);
        assert.equal(r3.drTier, 3);

        // Advance time by 2 seconds
        time += 2000;

        // 4th Application: Immune (0%)
        const r4 = engine.applyCrowdControl(charId, "STUN", baseDuration, time);
        assert.equal(r4.effectiveDurationMs, 0);
        assert.equal(r4.isImmune, true);
        assert.equal(r4.drTier, 4);
    });

    it("resets DR window after 15 seconds of no CC", () => {
        const engine = new DiminishingReturnsEngine();
        const charId = "player_mage_02";
        let time = 200000;

        // 1st App (100%)
        const r1 = engine.applyCrowdControl(charId, "SILENCE", 5000, time);
        assert.equal(r1.effectiveDurationMs, 5000);

        // Fast forward 21 seconds. 5s of CC duration + 16s of freedom.
        // The 15s DR reset window should have expired.
        time += 21000;

        // Should be back to 1st App (100%)
        const r2 = engine.applyCrowdControl(charId, "SILENCE", 5000, time);
        assert.equal(r2.effectiveDurationMs, 5000);
        assert.equal(r2.drTier, 1);
    });

    it("tracks different CC categories independently", () => {
        const engine = new DiminishingReturnsEngine();
        const charId = "player_warrior_03";
        const time = 300000;

        // Stun #1 (100%)
        const stunRes = engine.applyCrowdControl(charId, "STUN", 3000, time);
        assert.equal(stunRes.drTier, 1);
        assert.equal(stunRes.effectiveDurationMs, 3000);

        // Root #1 applied simultaneously (100% - independent tracker)
        const rootRes = engine.applyCrowdControl(charId, "ROOT", 6000, time);
        assert.equal(rootRes.drTier, 1);
        assert.equal(rootRes.effectiveDurationMs, 6000);
    });
});
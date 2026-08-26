import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CombatPositioningEngine } from "../lib/combatPositioning.js";

describe("CombatPositioningEngine Backstab & Flanking", () => {
    it("detects FRONTAL attack and grants defender block bonuses", () => {
        const defender = { x: 0, y: 0, facingAngleDegrees: 0 }; // Facing East
        const attacker = { x: 5, y: 0, facingAngleDegrees: 180 }; // Standing directly East of defender, facing West

        const res = CombatPositioningEngine.evaluateAttackVector(attacker, defender);
        assert.equal(res.vectorType, "FRONTAL");
        assert.equal(res.damageMultiplier, 1.0);
        assert.equal(res.defenderBonusBlockChance, 0.15);
    });

    it("detects BACKSTAB attack from directly behind the defender", () => {
        const defender = { x: 0, y: 0, facingAngleDegrees: 90 }; // Facing North
        const attacker = { x: 0, y: -5, facingAngleDegrees: 90 }; // Standing directly South (behind), facing North

        const res = CombatPositioningEngine.evaluateAttackVector(attacker, defender);
        assert.equal(res.vectorType, "BACKSTAB");
        assert.equal(res.damageMultiplier, 1.40);
        assert.equal(res.bonusCriticalChance, 0.25);
    });

    it("detects FLANK attack from the side", () => {
        const defender = { x: 0, y: 0, facingAngleDegrees: 0 }; // Facing East
        const attacker = { x: 0, y: 5, facingAngleDegrees: 270 }; // Standing directly North (left flank), facing South

        const res = CombatPositioningEngine.evaluateAttackVector(attacker, defender);
        assert.equal(res.vectorType, "FLANK");
        assert.equal(res.damageMultiplier, 1.15);
        assert.equal(res.bonusCriticalChance, 0.05);
    });
});
import { describe, it, expect } from "vitest";
import { CombatPositioningEngine, CombatEntityPosition } from "../lib/combatPositioning.js";

describe("CombatPositioningEngine Spatial Cones and Backstab Multipliers", () => {
    // Defender at (10, 10) facing North (PI/2 = 90 deg)
    const defender: CombatEntityPosition = {
        x: 10,
        y: 10,
        facingAngleRad: Math.PI / 2,
    };

    it("detects BACKSTAB attack from rear 90-degree cone", () => {
        // Attacker is directly South of defender at (10, 5)
        const southAttacker: CombatEntityPosition = { x: 10, y: 5, facingAngleRad: Math.PI / 2 };
        const mods = CombatPositioningEngine.computePositionalModifiers(southAttacker, defender);

        expect(mods.sector).toBe("BACKSTAB");
        expect(mods.damageMultiplier).toBe(1.40);
        expect(mods.criticalChanceBonusPercent).toBe(25.0);
    });

    it("detects FLANK attack from lateral sides", () => {
        // Attacker is East of defender at (15, 10)
        const eastAttacker: CombatEntityPosition = { x: 15, y: 10, facingAngleRad: Math.PI };
        const mods = CombatPositioningEngine.computePositionalModifiers(eastAttacker, defender);

        expect(mods.sector).toBe("FLANK");
        expect(mods.damageMultiplier).toBe(1.15);
    });

    it("safely handles coincident coordinates as FRONTAL", () => {
        const stackedAttacker: CombatEntityPosition = { x: 10, y: 10, facingAngleRad: 0 };
        const mods = CombatPositioningEngine.computePositionalModifiers(stackedAttacker, defender);

        expect(mods.sector).toBe("FRONTAL");
        expect(mods.damageMultiplier).toBe(1.0);
    });
});
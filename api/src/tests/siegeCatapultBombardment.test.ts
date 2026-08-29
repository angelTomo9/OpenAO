import { describe, it, expect } from "vitest";
import {
    SiegeCatapultBombardmentEngine,
    ActiveSiegeEngine,
    CastleFortification,
} from "../lib/siegeCatapultBombardment.js";

describe("SiegeCatapultBombardmentEngine Siege Engines, Ballistics & Castle Breaching", () => {
    it("deploys Heavy Trebuchet and fires Corrosive Flask within range", () => {
        const trebuchet = SiegeCatapultBombardmentEngine.deploySiegeEngine("engineer_01", "HEAVY_TREBUCHET", 100, 100, 100000);
        expect(trebuchet.engineType).toBe("HEAVY_TREBUCHET");
        expect(trebuchet.currentDurabilityHp).toBe(1500);

        const outerGate: CastleFortification = {
            structureId: "gate_01",
            structureType: "OUTER_GATE",
            location: { x: 130, y: 100 }, // 30 tiles away (within 60 max range)
            currentHp: 2500,
            maxHp: 2500,
            armorRating: 0,
            isBreached: false,
        };

        // 600 base * 1.5 Corrosive multiplier = 900 damage
        const fireRes = SiegeCatapultBombardmentEngine.fireBombardment(trebuchet, outerGate, "CORROSIVE_ALCHEMICAL_FLASK", 100000);
        expect(fireRes.success).toBe(true);
        expect(fireRes.damageDealt).toBe(900);
        expect(outerGate.currentHp).toBe(1600);
        expect(fireRes.isBreached).toBe(false);
    });

    it("enforces reload time cooldowns between successive volleys", () => {
        const catapult = SiegeCatapultBombardmentEngine.deploySiegeEngine("engineer_02", "MANGANEL_CATAPULT", 0, 0, 100000);
        const wall: CastleFortification = {
            structureId: "wall_01",
            structureType: "FORTIFIED_RAMPART",
            location: { x: 20, y: 0 },
            currentHp: 5000,
            maxHp: 5000,
            armorRating: 25,
            isBreached: false,
        };

        // First shot succeeds at t=100000
        const shot1 = SiegeCatapultBombardmentEngine.fireBombardment(catapult, wall, "BATTERING_BOULDER", 100000);
        expect(shot1.success).toBe(true);

        // Second shot 2 seconds later (102000) fails (Manganel requires 6s reload)
        const prematureShot = SiegeCatapultBombardmentEngine.fireBombardment(catapult, wall, "BATTERING_BOULDER", 102000);
        expect(prematureShot.success).toBe(false);
        expect(prematureShot.reason).toContain("reloading");

        // Third shot at t=107000 (7s elapsed) succeeds
        const validShot = SiegeCatapultBombardmentEngine.fireBombardment(catapult, wall, "BATTERING_BOULDER", 107000);
        expect(validShot.success).toBe(true);
    });

    it("breaches fortification when HP drops to 0 and blocks subsequent shots", () => {
        const trebuchet = SiegeCatapultBombardmentEngine.deploySiegeEngine("eng", "HEAVY_TREBUCHET", 0, 0, 100000);
        const weakGate: CastleFortification = {
            structureId: "g_01",
            structureType: "OUTER_GATE",
            location: { x: 10, y: 0 },
            currentHp: 500,
            maxHp: 2500,
            armorRating: 0,
            isBreached: false,
        };

        // 600 damage breaches gate (500 HP remaining)
        const fatalShot = SiegeCatapultBombardmentEngine.fireBombardment(trebuchet, weakGate, "BATTERING_BOULDER", 100000);
        expect(fatalShot.isBreached).toBe(true);
        expect(weakGate.isBreached).toBe(true);
        expect(weakGate.currentHp).toBe(0);

        // Firing at breached gate fails
        const overShot = SiegeCatapultBombardmentEngine.fireBombardment(trebuchet, weakGate, "BATTERING_BOULDER", 120000);
        expect(overShot.success).toBe(false);
        expect(overShot.reason).toContain("already breached");
    });

    it("rejects firing at targets beyond max range", () => {
        const ballista = SiegeCatapultBombardmentEngine.deploySiegeEngine("e", "BALLISTA_SIEGE_BOW", 0, 0, 100000); // 40 range
        const distantWall: CastleFortification = {
            structureId: "w_far",
            structureType: "FORTIFIED_RAMPART",
            location: { x: 50, y: 0 }, // 50 tiles away
            currentHp: 3000,
            maxHp: 3000,
            armorRating: 0,
            isBreached: false,
        };

        const outOfRange = SiegeCatapultBombardmentEngine.fireBombardment(ballista, distantWall, "BATTERING_BOULDER", 100000);
        expect(outOfRange.success).toBe(false);
        expect(outOfRange.reason).toContain("out of range");
    });

    it("guards against unsupported siege engine types", () => {
        expect(() => SiegeCatapultBombardmentEngine.deploySiegeEngine("e", "LASER_CANNON" as any, 0, 0)).toThrow(
            "Unsupported siege engine type"
        );
    });
});
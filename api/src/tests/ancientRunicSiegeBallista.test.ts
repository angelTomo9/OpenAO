import { describe, it, expect } from "vitest";
import {
    AncientRunicSiegeBallistaEngine,
    DeployedSiegeBallista,
    BallistaBombardmentTarget,
} from "../lib/ancientRunicSiegeBallista.js";

describe("AncientRunicSiegeBallistaEngine Ballistas & Structural Demolition", () => {
    it("deploys Doom Titan Ballista and obliterates Fortress Stone Wall with Titan Piercer Bolt (2.5x multiplier)", () => {
        const ballista = AncientRunicSiegeBallistaEngine.deployBallista("engineer_01", "DOOM_TITAN_BALLISTA", 0, 0, 100000);
        expect(ballista.ballistaType).toBe("DOOM_TITAN_BALLISTA");
        expect(ballista.currentDurabilityHp).toBe(1000);

        // Wall at (20, 0) -> distance 20 (within [8, 60] range)
        const wall: BallistaBombardmentTarget = {
            targetId: "wall_north_01",
            targetType: "FORTRESS_STONE_WALL",
            location: { x: 20, y: 0 },
            currentHp: 800,
            armorRating: 50,
            isDestroyed: false,
            appliedEffects: [],
        };

        // Titan Piercer base 150 * 2.5 structure multiplier = 375 raw dmg. Armor mitigation: 50 * 0.3 = 15 -> 360 dmg
        const shotRes = AncientRunicSiegeBallistaEngine.fireKineticBolt(ballista, "TITAN_PIERCER_BOLT", wall);
        expect(shotRes.success).toBe(true);
        expect(shotRes.damageDealt).toBe(360);
        expect(shotRes.isStructureDemolished).toBe(false);
        expect(wall.currentHp).toBe(440);
    });

    it("applies armor piercing with Void Shatter Bolt against enemy combat unit", () => {
        const arbalest = AncientRunicSiegeBallistaEngine.deployBallista("eng_02", "RUNIC_ARBALEST", 10, 10, 100000);
        const enemyKnight: BallistaBombardmentTarget = {
            targetId: "heavy_knight",
            targetType: "ENEMY_COMBAT_UNIT",
            location: { x: 25, y: 10 }, // distance 15 tiles
            currentHp: 300,
            armorRating: 100,
            isDestroyed: false,
            appliedEffects: [],
        };

        // Void Shatter base 200 dmg * 1.0 (unit target) = 200 raw dmg. Armor 50% ignored (50 armor * 0.3 = 15) -> 185 dmg
        const shot = AncientRunicSiegeBallistaEngine.fireKineticBolt(arbalest, "VOID_SHATTER_BOLT", enemyKnight);
        expect(shot.success).toBe(true);
        expect(shot.damageDealt).toBe(185);
        expect(enemyKnight.appliedEffects).toContain("ARMOR_PIERCING_50");
    });

    it("rejects firing when target is outside minimum or maximum range", () => {
        const ballista = AncientRunicSiegeBallistaEngine.deployBallista("eng", "IRONCLAD_SIEGE_BALLISTA", 0, 0, 100000); // Range [5, 45]

        // Too close (distance 2 tiles < 5 min range)
        const closeTarget: BallistaBombardmentTarget = {
            targetId: "near_t",
            targetType: "ENEMY_COMBAT_UNIT",
            location: { x: 2, y: 0 },
            currentHp: 100,
            armorRating: 0,
            isDestroyed: false,
            appliedEffects: [],
        };
        const closeRes = AncientRunicSiegeBallistaEngine.fireKineticBolt(ballista, "TITAN_PIERCER_BOLT", closeTarget);
        expect(closeRes.success).toBe(false);
        expect(closeRes.reason).toContain("out of range");

        // Too far (distance 50 tiles > 45 max range)
        const farTarget: BallistaBombardmentTarget = {
            targetId: "far_t",
            targetType: "FORTRESS_STONE_WALL",
            location: { x: 50, y: 0 },
            currentHp: 100,
            armorRating: 0,
            isDestroyed: false,
            appliedEffects: [],
        };
        const farRes = AncientRunicSiegeBallistaEngine.fireKineticBolt(ballista, "TITAN_PIERCER_BOLT", farTarget);
        expect(farRes.success).toBe(false);
        expect(farRes.reason).toContain("out of range");
    });

    it("repairs damaged ballistas with repair kits and clamps to max durability", () => {
        const ballista = AncientRunicSiegeBallistaEngine.deployBallista("eng", "IRONCLAD_SIEGE_BALLISTA", 0, 0, 100000);
        ballista.currentDurabilityHp = 200; // Damaged from 600

        const repairRes = AncientRunicSiegeBallistaEngine.repairBallista(ballista, 300);
        expect(repairRes.success).toBe(true);
        expect(repairRes.newDurability).toBe(500);

        // Clamp to max
        AncientRunicSiegeBallistaEngine.repairBallista(ballista, 500);
        expect(ballista.currentDurabilityHp).toBe(600);
    });

    it("guards against destroyed targets and unsupported ballista models", () => {
        expect(() => AncientRunicSiegeBallistaEngine.deployBallista("eng", "PLASTIC_SLINGSHOT" as any)).toThrow(
            "Unsupported ballista type"
        );

        const ballista = AncientRunicSiegeBallistaEngine.deployBallista("eng", "RUNIC_ARBALEST", 0, 0);
        const destroyedGate: BallistaBombardmentTarget = {
            targetId: "broken_gate",
            targetType: "CASTLE_REINFORCED_GATE",
            location: { x: 10, y: 0 },
            currentHp: 0,
            armorRating: 0,
            isDestroyed: true,
            appliedEffects: [],
        };

        const blockedShot = AncientRunicSiegeBallistaEngine.fireKineticBolt(ballista, "TITAN_PIERCER_BOLT", destroyedGate);
        expect(blockedShot.success).toBe(false);
        expect(blockedShot.reason).toContain("already destroyed");
    });
});
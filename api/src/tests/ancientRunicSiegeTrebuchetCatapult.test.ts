import { describe, it, expect } from "vitest";
import {
    AncientRunicSiegeTrebuchetCatapultEngine,
    ActiveSiegeArtillery,
    FortificationTarget,
} from "../lib/ancientRunicSiegeTrebuchetCatapult.js";

describe("AncientRunicSiegeTrebuchetCatapultEngine Heavy Demolition Artillery", () => {
    it("bombards Obsidian Citadel Wall with Celestial Gravity Mortar dealing 5.0x demolition damage and collapses wall", () => {
        const mortar = AncientRunicSiegeTrebuchetCatapultEngine.deployArtillery("commander_01", "CELESTIAL_GRAVITY_MORTAR", 0, 0, 100000);
        expect(mortar.artilleryType).toBe("CELESTIAL_GRAVITY_MORTAR");
        expect(mortar.currentDurability).toBe(350);

        const citadelWall: FortificationTarget = {
            targetId: "wall_citadel_01",
            structureType: "OBSIDIAN_CITADEL_WALL",
            location: { x: 50, y: 0 }, // 50 tiles distance (within 15-90 range)
            currentHealth: 2500,
            maxHealth: 8000,
            isCollapsed: false,
        };

        // Void Arc munition: 450 base * 5.0 mortar * 2.0 structure bonus = 4500 raw damage * (1 - 0.40 armor) = 2700 damage
        const strikeRes = AncientRunicSiegeTrebuchetCatapultEngine.bombardStructure(
            mortar,
            citadelWall,
            "VOID_ARC_SHATTER_SPHERE",
            100000
        );

        expect(strikeRes.success).toBe(true);
        expect(strikeRes.result?.directDamageDealt).toBe(2700);
        expect(strikeRes.result?.targetRemainingHealth).toBe(0);
        expect(strikeRes.result?.isTargetCollapsed).toBe(true);
        expect(citadelWall.isCollapsed).toBe(true);
        expect(mortar.currentDurability).toBe(338); // 350 - 12
    });

    it("rejects bombardment when target is out of ballistic firing range", () => {
        const catapult = AncientRunicSiegeTrebuchetCatapultEngine.deployArtillery("c_02", "IRON_SIEGE_CATAPULT", 0, 0); // Max range 40
        const farGate: FortificationTarget = {
            targetId: "gate_01",
            structureType: "STONE_FORTRESS_GATE",
            location: { x: 80, y: 0 }, // 80 tiles > 40 max
            currentHealth: 3500,
            maxHealth: 3500,
            isCollapsed: false,
        };

        const failRes = AncientRunicSiegeTrebuchetCatapultEngine.bombardStructure(catapult, farGate, "KINETIC_STONE_BOULDER");
        expect(failRes.success).toBe(false);
        expect(failRes.reason).toContain("out of artillery ballistic range");
        expect(catapult.currentDurability).toBe(120);
    });

    it("rejects bombardment when target is already collapsed", () => {
        const trebuchet = AncientRunicSiegeTrebuchetCatapultEngine.deployArtillery("c_03", "RUNIC_HEAVY_TREBUCHET", 0, 0);
        const deadPalisade: FortificationTarget = {
            targetId: "pal_01",
            structureType: "WOODEN_PALISADE",
            location: { x: 30, y: 0 },
            currentHealth: 0,
            maxHealth: 1000,
            isCollapsed: true,
        };

        const failRes = AncientRunicSiegeTrebuchetCatapultEngine.bombardStructure(trebuchet, deadPalisade, "INCENDIARY_PITCH_ORB");
        expect(failRes.success).toBe(false);
        expect(failRes.reason).toContain("already destroyed");
    });

    it("repairs damaged artillery and restores operational status", () => {
        const catapult = AncientRunicSiegeTrebuchetCatapultEngine.deployArtillery("c_04", "IRON_SIEGE_CATAPULT", 0, 0);
        catapult.currentDurability = 0;
        catapult.isOperational = false;

        const rep = AncientRunicSiegeTrebuchetCatapultEngine.repairArtillery(catapult, 60);
        expect(rep.success).toBe(true);
        expect(rep.newDurability).toBe(60);
        expect(rep.isOperational).toBe(true);
    });

    it("guards against null inputs and unsupported artillery types", () => {
        expect(() => AncientRunicSiegeTrebuchetCatapultEngine.deployArtillery("c", "SLINGSHOT" as any)).toThrow(
            "Unsupported siege artillery type"
        );

        expect(AncientRunicSiegeTrebuchetCatapultEngine.bombardStructure(null as any, null as any, "INCENDIARY_PITCH_ORB").success).toBe(false);
        expect(AncientRunicSiegeTrebuchetCatapultEngine.repairArtillery(null as any).success).toBe(false);
    });
});
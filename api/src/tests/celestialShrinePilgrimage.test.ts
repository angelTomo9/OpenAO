import { describe, it, expect } from "vitest";
import {
    CelestialShrinePilgrimageEngine,
    PlayerPilgrimState,
} from "../lib/celestialShrinePilgrimage.js";

describe("CelestialShrinePilgrimageEngine Devotion Tiers & Grand Pilgrimage", () => {
    it("presents sacred offerings and ascends from ACOLYTE to ZEALOT and CHAMPION", () => {
        const pilgrim: PlayerPilgrimState = {
            playerId: "pilgrim_01",
            devotionPietyPoints: 0,
            currentTier: "ACOLYTE",
            visitedShrines: new Set(),
            lastPilgrimageResetEpochMs: 100000,
        };

        // 2 Golden Tithes (+200 Piety) -> Zealot
        CelestialShrinePilgrimageEngine.presentOffering(pilgrim, "GOLDEN_TITHE");
        const res2 = CelestialShrinePilgrimageEngine.presentOffering(pilgrim, "GOLDEN_TITHE");
        expect(res2.newPiety).toBe(200);
        expect(res2.newTier).toBe("ZEALOT");
        expect(pilgrim.currentTier).toBe("ZEALOT");

        // 3 more Golden Tithes (+300 Piety -> 500 Piety) -> Champion
        for (let i = 0; i < 3; i++) {
            CelestialShrinePilgrimageEngine.presentOffering(pilgrim, "GOLDEN_TITHE");
        }
        expect(pilgrim.devotionPietyPoints).toBe(500);
        expect(pilgrim.currentTier).toBe("CHAMPION");
    });

    it("visits elemental shrines scaling bonuses with devotion tier", () => {
        const avatarPilgrim: PlayerPilgrimState = {
            playerId: "avatar_01",
            devotionPietyPoints: 950,
            currentTier: "AVATAR_OF_THE_GODS",
            visitedShrines: new Set(),
            lastPilgrimageResetEpochMs: 100000,
        };

        // Sun Shrine base 300 HP * 2.0 Avatar multiplier = 600 HP bonus
        const sunVisit = CelestialShrinePilgrimageEngine.visitShrine(avatarPilgrim, "SHRINE_OF_THE_SUN", 100000);
        expect(sunVisit.success).toBe(true);
        expect(sunVisit.blessing?.bonusStatValue).toBe(600);
        expect(sunVisit.isGrandPilgrimEligible).toBe(false);
    });

    it("completes full 4-shrine pilgrimage and unlocks Grand Pilgrim Blessing", () => {
        const pilgrim: PlayerPilgrimState = {
            playerId: "pilgrim_02",
            devotionPietyPoints: 300,
            currentTier: "ZEALOT",
            visitedShrines: new Set(),
            lastPilgrimageResetEpochMs: 100000,
        };

        CelestialShrinePilgrimageEngine.visitShrine(pilgrim, "SHRINE_OF_THE_SUN", 100000);
        CelestialShrinePilgrimageEngine.visitShrine(pilgrim, "SHRINE_OF_THE_MOON", 100000);
        CelestialShrinePilgrimageEngine.visitShrine(pilgrim, "SHRINE_OF_THE_STORM", 100000);
        const finalVisit = CelestialShrinePilgrimageEngine.visitShrine(pilgrim, "SHRINE_OF_THE_EARTH", 100000);

        expect(finalVisit.isGrandPilgrimEligible).toBe(true);
        expect(pilgrim.visitedShrines.size).toBe(4);

        const grandClaim = CelestialShrinePilgrimageEngine.claimGrandPilgrimBlessing(pilgrim, 100000);
        expect(grandClaim.success).toBe(true);
        expect(grandClaim.blessing?.shrineType).toBe("GRAND_PILGRIMAGE");
        expect(grandClaim.blessing?.durationMinutes).toBe(120);
    });

    it("rejects Grand Pilgrim Blessing when pilgrimage is incomplete", () => {
        const incompletePilgrim: PlayerPilgrimState = {
            playerId: "p",
            devotionPietyPoints: 0,
            currentTier: "ACOLYTE",
            visitedShrines: new Set(["SHRINE_OF_THE_SUN"]),
            lastPilgrimageResetEpochMs: 100000,
        };

        const res = CelestialShrinePilgrimageEngine.claimGrandPilgrimBlessing(incompletePilgrim);
        expect(res.success).toBe(false);
        expect(res.reason).toContain("requires visiting all 4 shrines");
    });

    it("defensively guards against invalid offerings and unsupported shrines", () => {
        const pilgrim: PlayerPilgrimState = {
            playerId: "p",
            devotionPietyPoints: 0,
            currentTier: "ACOLYTE",
            visitedShrines: new Set(),
            lastPilgrimageResetEpochMs: 100000,
        };

        const badOffering = CelestialShrinePilgrimageEngine.presentOffering(pilgrim, "MUD_PIE" as any);
        expect(badOffering.success).toBe(false);

        const badShrine = CelestialShrinePilgrimageEngine.visitShrine(pilgrim, "SHRINE_OF_CHEESE" as any);
        expect(badShrine.success).toBe(false);
    });
});
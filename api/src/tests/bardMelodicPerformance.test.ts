import { describe, it, expect } from "vitest";
import {
    BardMelodicPerformanceEngine,
    BardPlayer,
    PartyMember,
} from "../lib/bardMelodicPerformance.js";

describe("BardMelodicPerformanceEngine Songcraft, Auras & Crescendos", () => {
    it("starts performance with War Horn and propagates Hymn of Valor aura to nearby allies", () => {
        const bard: BardPlayer = {
            playerId: "bard_01",
            instrument: "WAR_HORN_OF_VALHALLA", // 1.6x multiplier
            performanceState: "RESTING",
            location: { x: 50, y: 50 },
            currentMana: 200,
            maxMana: 200,
            chordComboCount: 0,
            performanceStartedEpochMs: 0,
        };

        const warrior: PartyMember = {
            memberId: "warrior_01",
            location: { x: 55, y: 50 }, // 5 tiles away (within 15)
            currentHp: 1000,
            maxHp: 1000,
            isAlive: true,
        };

        const mageDistant: PartyMember = {
            memberId: "mage_02",
            location: { x: 100, y: 50 }, // 50 tiles away (out of range)
            currentHp: 600,
            maxHp: 600,
            isAlive: true,
        };

        const startRes = BardMelodicPerformanceEngine.startPerformance(bard, "HYMN_OF_VALOR", 100000);
        expect(startRes.success).toBe(true);
        expect(bard.performanceState).toBe("PERFORMING_SONG");
        expect(bard.currentMana).toBe(175); // 200 - 25

        // Propagate aura: Base 40 * 1.6 War Horn = 64 potency
        const auraRes = BardMelodicPerformanceEngine.propagateMelodicAura(bard, [warrior, mageDistant], 100000);
        expect(auraRes.affectedCount).toBe(1);
        expect(auraRes.potencyApplied).toBe(64);
        expect(warrior.activeAuraBuff?.potencyBonusValue).toBe(64);
        expect(mageDistant.activeAuraBuff).toBeUndefined();
    });

    it("advances chord combos to trigger Harmonic Crescendo doubling aura potency", () => {
        const bard: BardPlayer = {
            playerId: "bard_02",
            instrument: "HARP_OF_THE_SERAPH", // 1.3x multiplier
            performanceState: "RESTING",
            location: { x: 0, y: 0 },
            currentMana: 200,
            maxMana: 200,
            chordComboCount: 0,
            performanceStartedEpochMs: 0,
        };

        BardMelodicPerformanceEngine.startPerformance(bard, "BALLAD_OF_SWIFTNESS", 100000); // combo = 1
        BardMelodicPerformanceEngine.playChordVerse(bard); // combo = 2
        const finalVerse = BardMelodicPerformanceEngine.playChordVerse(bard); // combo = 3 -> Crescendo

        expect(finalVerse.isCrescendoReady).toBe(true);
        expect(bard.performanceState).toBe("DISCORDANT_CRESCENDO");

        const ally: PartyMember = {
            memberId: "ally_1",
            location: { x: 2, y: 2 },
            currentHp: 500,
            maxHp: 500,
            isAlive: true,
        };

        // Ballad base 25 * 1.3 Harp * 2.0 Crescendo = 65 potency
        const aura = BardMelodicPerformanceEngine.propagateMelodicAura(bard, [ally], 100000);
        expect(aura.potencyApplied).toBe(65);
        expect(ally.activeAuraBuff?.potencyBonusValue).toBe(65);
    });

    it("halts performance when mana depletes during chord progression", () => {
        const oomBard: BardPlayer = {
            playerId: "bard_oom",
            instrument: "LUTE_OF_THE_MEADOWS",
            performanceState: "RESTING",
            location: { x: 0, y: 0 },
            currentMana: 30,
            maxMana: 100,
            chordComboCount: 0,
            performanceStartedEpochMs: 0,
        };

        // Hymn costs 25 mana -> 5 mana remaining
        BardMelodicPerformanceEngine.startPerformance(oomBard, "HYMN_OF_VALOR", 100000);
        expect(oomBard.currentMana).toBe(5);

        // Next chord requires 25 mana -> fails and rests
        const failChord = BardMelodicPerformanceEngine.playChordVerse(oomBard);
        expect(failChord.success).toBe(false);
        expect(failChord.reason).toContain("Mana depleted");
        expect(oomBard.performanceState).toBe("RESTING");
    });

    it("defensively ignores dead party members during aura propagation", () => {
        const bard: BardPlayer = {
            playerId: "b",
            instrument: "LUTE_OF_THE_MEADOWS",
            performanceState: "PERFORMING_SONG",
            currentSong: "REQUIEM_OF_THE_FALLEN",
            location: { x: 0, y: 0 },
            currentMana: 100,
            maxMana: 100,
            chordComboCount: 1,
            performanceStartedEpochMs: 0,
        };

        const deadAlly: PartyMember = {
            memberId: "dead_1",
            location: { x: 1, y: 1 },
            currentHp: 0,
            maxHp: 100,
            isAlive: false,
        };

        const aura = BardMelodicPerformanceEngine.propagateMelodicAura(bard, [deadAlly], 100000);
        expect(aura.affectedCount).toBe(0);
        expect(deadAlly.activeAuraBuff).toBeUndefined();
    });

    it("guards against unknown songs and invalid inputs", () => {
        const bard: BardPlayer = {
            playerId: "b",
            instrument: "LUTE_OF_THE_MEADOWS",
            performanceState: "RESTING",
            location: { x: 0, y: 0 },
            currentMana: 100,
            maxMana: 100,
            chordComboCount: 0,
            performanceStartedEpochMs: 0,
        };

        const res = BardMelodicPerformanceEngine.startPerformance(bard, "HEAVY_METAL" as any);
        expect(res.success).toBe(false);
        expect(res.reason).toContain("Unknown song");
    });
});
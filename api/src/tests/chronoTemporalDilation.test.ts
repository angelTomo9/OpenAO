import { describe, it, expect } from "vitest";
import {
    ChronoTemporalDilationEngine,
    PlayerChronoState,
} from "../lib/chronoTemporalDilation.js";

describe("ChronoTemporalDilationEngine Temporal Spells & Paradox Backlash", () => {
    it("casts TIME_WARP and accelerates cooldown rate by 1.5x", () => {
        const mage: PlayerChronoState = {
            playerId: "chrono_mage_1",
            currentHp: 1000,
            maxHp: 1000,
            healthSnapshots: [],
            activeEffects: [],
            isStasisLocked: false,
        };

        const castRes = ChronoTemporalDilationEngine.castChronoSpell(mage, mage, "TIME_WARP", 10, 100000);
        expect(castRes.success).toBe(true);
        expect(castRes.effect?.spellType).toBe("TIME_WARP");

        const cdMultiplier = ChronoTemporalDilationEngine.calculateCooldownMultiplier(mage);
        expect(cdMultiplier).toBe(1.5);
    });

    it("locks target in CHRONO_STASIS and halts cooldown progression to 0", () => {
        const mage: PlayerChronoState = {
            playerId: "chrono_mage_1",
            currentHp: 1000,
            maxHp: 1000,
            healthSnapshots: [],
            activeEffects: [],
            isStasisLocked: false,
        };

        ChronoTemporalDilationEngine.castChronoSpell(mage, mage, "CHRONO_STASIS", 5, 100000);
        expect(mage.isStasisLocked).toBe(true);

        const cdMultiplier = ChronoTemporalDilationEngine.calculateCooldownMultiplier(mage);
        expect(cdMultiplier).toBe(0);

        // Advance past 5s duration -> Stasis cleanses
        ChronoTemporalDilationEngine.cleanseExpiredEffects(mage, 106000);
        expect(mage.isStasisLocked).toBe(false);
    });

    it("rewinds health to state 5 seconds prior with REWIND_FATE", () => {
        const mage: PlayerChronoState = {
            playerId: "chrono_mage_1",
            currentHp: 1000,
            maxHp: 1000,
            healthSnapshots: [],
            activeEffects: [],
            isStasisLocked: false,
        };

        // Snapshot full health at 100000
        ChronoTemporalDilationEngine.recordHealthSnapshot(mage, 100000);

        // Takes heavy damage at 106000
        mage.currentHp = 200;

        // Casts Rewind Fate at 106000
        const rewindRes = ChronoTemporalDilationEngine.castChronoSpell(mage, mage, "REWIND_FATE", 5, 106000);
        expect(rewindRes.success).toBe(true);
        expect(mage.currentHp).toBe(1000); // Restored to 1000
    });

    it("triggers Temporal Paradox Backlash and deals 35% damage when stacking too many spells", () => {
        const mage: PlayerChronoState = {
            playerId: "reckless_mage",
            currentHp: 1000,
            maxHp: 1000,
            healthSnapshots: [],
            activeEffects: [],
            isStasisLocked: false,
        };

        // Cast 3 spells safely
        ChronoTemporalDilationEngine.castChronoSpell(mage, mage, "TIME_WARP", 20, 100000);
        ChronoTemporalDilationEngine.castChronoSpell(mage, mage, "TIME_WARP", 20, 100000);
        ChronoTemporalDilationEngine.castChronoSpell(mage, mage, "TIME_WARP", 20, 100000);

        // 4th spell exceeds MAX_PARADOX_THRESHOLD (3) -> Triggers Paradox Backlash
        const paradoxRes = ChronoTemporalDilationEngine.castChronoSpell(mage, mage, "TIME_WARP", 20, 100000);
        expect(paradoxRes.success).toBe(false);
        expect(paradoxRes.isParadoxTriggered).toBe(true);
        expect(paradoxRes.paradoxDamageDealt).toBe(350); // 35% of 1000
        expect(mage.currentHp).toBe(650);
        expect(mage.activeEffects.length).toBe(0); // Dispelled
    });
});
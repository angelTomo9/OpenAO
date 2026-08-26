/**
 * Crowd Control Diminishing Returns (DR) & Immunity Engine for OpenAO MMORPG.
 * Simulates PvP diminishing returns windows (100% -> 50% -> 25% -> Immune) for STUN, ROOT, SILENCE, etc.
 */

export type CrowdControlCategory = "STUN" | "ROOT" | "SILENCE" | "DISARM" | "FEAR";

export interface DiminishingReturnsRecord {
    applicationCount: number;
    lastApplicationEpochMs: number;
    lastEndEpochMs: number;
}

export class DiminishingReturnsEngine {
    private static readonly DR_WINDOW_MS = 15000; // 15 seconds reset window

    // Maps CharacterID -> Category -> DR Record
    private drState: Map<string, Map<CrowdControlCategory, DiminishingReturnsRecord>> = new Map();

    /**
     * Retrieves the current tracking record, resetting it if the DR window has expired.
     */
    private getOrResetRecord(characterId: string, category: CrowdControlCategory, currentEpochMs: number): DiminishingReturnsRecord {
        let charState = this.drState.get(characterId);
        if (!charState) {
            charState = new Map();
            this.drState.set(characterId, charState);
        }

        let record = charState.get(category);
        
        // If no record exists OR the window has expired since the *end* of the last CC
        if (!record || (currentEpochMs - record.lastEndEpochMs) > DiminishingReturnsEngine.DR_WINDOW_MS) {
            record = {
                applicationCount: 0,
                lastApplicationEpochMs: 0,
                lastEndEpochMs: 0,
            };
            charState.set(category, record);
        }

        return record;
    }

    /**
     * Calculates the effective duration for a new CC application and updates the DR tracking state.
     */
    public applyCrowdControl(
        characterId: string,
        category: CrowdControlCategory,
        baseDurationMs: number,
        currentEpochMs: number
    ): { effectiveDurationMs: number; isImmune: boolean; drTier: number } {
        const record = this.getOrResetRecord(characterId, category, currentEpochMs);

        let multiplier = 1.0;
        let isImmune = false;
        
        const drTier = record.applicationCount;

        if (drTier === 0) {
            multiplier = 1.0; // 100%
        } else if (drTier === 1) {
            multiplier = 0.5; // 50%
        } else if (drTier === 2) {
            multiplier = 0.25; // 25%
        } else {
            multiplier = 0.0; // Immune
            isImmune = true;
        }

        const effectiveDurationMs = Math.floor(baseDurationMs * multiplier);

        // Update record tracking
        record.applicationCount += 1;
        record.lastApplicationEpochMs = currentEpochMs;
        // The DR reset window starts after the CC effect *ends*
        record.lastEndEpochMs = currentEpochMs + effectiveDurationMs;

        return {
            effectiveDurationMs,
            isImmune,
            drTier: drTier + 1, // Returning 1-indexed tier for reporting (1st, 2nd, 3rd, 4th+)
        };
    }

    /**
     * Forcefully clears all DR history for a character (e.g. upon death or zoning).
     */
    public clearCharacterHistory(characterId: string): void {
        this.drState.delete(characterId);
    }
}
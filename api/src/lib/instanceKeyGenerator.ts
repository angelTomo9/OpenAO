import crypto from "node:crypto";

/**
 * Deterministic Dungeon Instance Key Generator for OpenAO MMORPG.
 * Generates HMAC-SHA256 authenticated instance access keys with difficulty
 * and party scaling parameters, featuring safe constant-time verification.
 */

export type DungeonDifficulty = "NORMAL" | "HEROIC" | "MYTHIC";

export interface InstanceKeyParams {
    dungeonId: string;
    difficulty: DungeonDifficulty;
    partyLeaderId: string;
    partySize: number; // 1 to 5
    createdAtEpochMs: number;
}

export interface InstanceScalingModifiers {
    healthMultiplier: number;
    damageMultiplier: number;
    lootQualityBonusPercent: number;
}

export class DungeonInstanceKeyGenerator {
    private static readonly SECRET_SALT = "openao_dungeon_instance_secret_key_2026";
    private static readonly SIGNATURE_HEX_LENGTH = 32; // 128-bit truncated HMAC for high collision resistance

    /**
     * Generates a tamper-proof instance token string.
     */
    public static generateInstanceKey(params: InstanceKeyParams): string {
        const payload = `${params.dungeonId}:${params.difficulty}:${params.partyLeaderId}:${params.partySize}:${params.createdAtEpochMs}`;
        const hmac = crypto.createHmac("sha256", this.SECRET_SALT).update(payload).digest("hex");
        const signature = hmac.slice(0, this.SIGNATURE_HEX_LENGTH);
        return `inst_${payload}:${signature}`;
    }

    /**
     * Safely verifies token authenticity and integrity using length-guarded timingSafeEqual.
     */
    public static verifyInstanceKey(instanceKey: string, params: InstanceKeyParams): boolean {
        if (!instanceKey || typeof instanceKey !== "string") {
            return false;
        }

        const expectedKey = this.generateInstanceKey(params);

        const aBuf = Buffer.from(instanceKey, "utf8");
        const bBuf = Buffer.from(expectedKey, "utf8");

        // Constant-time length mismatch guard prevents RangeError exception
        if (aBuf.length !== bBuf.length) {
            return false;
        }

        return crypto.timingSafeEqual(aBuf, bBuf);
    }

    /**
     * Computes the parametric combat and loot scaling modifiers for the instance.
     */
    public static computeScalingModifiers(
        difficulty: DungeonDifficulty,
        partySize: number
    ): InstanceScalingModifiers {
        const clampedParty = Math.min(5, Math.max(1, partySize));

        let baseHealthMult = 1.0;
        let baseDamageMult = 1.0;
        let baseLootBonus = 0;

        switch (difficulty) {
            case "HEROIC":
                baseHealthMult = 1.8;
                baseDamageMult = 1.4;
                baseLootBonus = 25;
                break;
            case "MYTHIC":
                baseHealthMult = 3.0;
                baseDamageMult = 2.2;
                baseLootBonus = 60;
                break;
            case "NORMAL":
            default:
                baseHealthMult = 1.0;
                baseDamageMult = 1.0;
                baseLootBonus = 0;
                break;
        }

        // Party scaling: +20% HP and +5% damage per additional party member beyond 1
        const partyHpFactor = 1.0 + (clampedParty - 1) * 0.20;
        const partyDmgFactor = 1.0 + (clampedParty - 1) * 0.05;

        return {
            healthMultiplier: Math.round(baseHealthMult * partyHpFactor * 100) / 100,
            damageMultiplier: Math.round(baseDamageMult * partyDmgFactor * 100) / 100,
            lootQualityBonusPercent: baseLootBonus + (clampedParty - 1) * 5,
        };
    }
}
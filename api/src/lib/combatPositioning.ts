/**
 * 2D Positional Combat & Backstab / Flanking Angle Engine for OpenAO MMORPG.
 * Simulates directional attack cones, backstab/flanking critical modifiers,
 * and frontal shield block mechanics with zero-distance safety.
 */

export type CombatRelativeAngle = "BACKSTAB" | "FLANK" | "FRONTAL";

export interface CombatEntityPosition {
    x: number;
    y: number;
    facingAngleRad: number; // 0 to 2*PI radians (0 = East, PI/2 = North, PI = West, 3*PI/2 = South)
}

export interface PositionalDamageModifiers {
    sector: CombatRelativeAngle;
    damageMultiplier: number;
    criticalChanceBonusPercent: number;
    defenderParryBlockBonusPercent: number;
}

export class CombatPositioningEngine {
    /**
     * Resolves the relative positional sector of an attacker with respect to the defender's orientation.
     * Backstab sector: Rear 90-degree cone (angleDiff >= 135 deg).
     * Flank sector: Lateral 75-degree cones on left/right (60 <= angleDiff < 135 deg).
     * Frontal sector: Frontal 120-degree cone (angleDiff < 60 deg).
     */
    public static getRelativeAngle(
        attacker: CombatEntityPosition,
        defender: CombatEntityPosition
    ): CombatRelativeAngle {
        const dx = attacker.x - defender.x;
        const dy = attacker.y - defender.y;

        // Zero-distance guard for stacked identical coordinates
        if (dx === 0 && dy === 0) {
            return "FRONTAL";
        }

        // Angle of line from defender to attacker
        let attackAngle = Math.atan2(dy, dx);
        if (attackAngle < 0) attackAngle += 2 * Math.PI;

        // Difference between attacker's position vector and defender's facing direction
        let diff = Math.abs(attackAngle - defender.facingAngleRad);
        if (diff > Math.PI) diff = 2 * Math.PI - diff;

        const diffDeg = (diff * 180) / Math.PI;

        if (diffDeg >= 135) {
            return "BACKSTAB";
        } else if (diffDeg >= 60) {
            return "FLANK";
        } else {
            return "FRONTAL";
        }
    }

    /**
     * Calculates the damage and critical strike modifiers based on positional combat sector.
     */
    public static computePositionalModifiers(
        attacker: CombatEntityPosition,
        defender: CombatEntityPosition
    ): PositionalDamageModifiers {
        const sector = this.getRelativeAngle(attacker, defender);

        switch (sector) {
            case "BACKSTAB":
                return {
                    sector: "BACKSTAB",
                    damageMultiplier: 1.40,
                    criticalChanceBonusPercent: 25.0,
                    defenderParryBlockBonusPercent: -100.0,
                };
            case "FLANK":
                return {
                    sector: "FLANK",
                    damageMultiplier: 1.15,
                    criticalChanceBonusPercent: 5.0,
                    defenderParryBlockBonusPercent: -25.0,
                };
            case "FRONTAL":
            default:
                return {
                    sector: "FRONTAL",
                    damageMultiplier: 1.0,
                    criticalChanceBonusPercent: 0.0,
                    defenderParryBlockBonusPercent: 15.0,
                };
        }
    }
}
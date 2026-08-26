/**
 * Positional Combat & Backstab Modifier Engine for OpenAO MMORPG.
 * Simulates directional attack vectors, flanking damage bonuses, and backstab critical modifiers
 * based on attacker and defender 2D spatial orientation.
 */

export interface CombatEntityPosition {
    x: number;
    y: number;
    facingAngleDegrees: number; // 0 to 359, where 0 is East, 90 is North, 180 is West, 270 is South
}

export type AttackVectorType = "FRONTAL" | "FLANK" | "BACKSTAB";

export interface PositionalCombatResult {
    vectorType: AttackVectorType;
    damageMultiplier: number;
    bonusCriticalChance: number;
    defenderBonusBlockChance: number;
}

export class CombatPositioningEngine {
    /**
     * Normalizes an angle to be strictly between 0 and 360 degrees.
     */
    private static normalizeAngle(angle: number): number {
        let normalized = angle % 360;
        if (normalized < 0) {
            normalized += 360;
        }
        return normalized;
    }

    /**
     * Calculates the absolute shortest difference between two angles in degrees (0 to 180).
     */
    private static getAngleDifference(angle1: number, angle2: number): number {
        const diff = Math.abs(this.normalizeAngle(angle1) - this.normalizeAngle(angle2));
        return diff > 180 ? 360 - diff : diff;
    }

    /**
     * Evaluates the attack vector based on coordinates and orientation.
     */
    public static evaluateAttackVector(
        attacker: CombatEntityPosition,
        defender: CombatEntityPosition
    ): PositionalCombatResult {
        // Calculate the vector from Defender TO Attacker
        const dx = attacker.x - defender.x;
        const dy = attacker.y - defender.y;

        // Angle from Defender to Attacker
        // Math.atan2 returns -PI to PI. We convert to 0-360 standard mapping.
        let attackAngleRadians = Math.atan2(dy, dx);
        let attackAngleDegrees = this.normalizeAngle((attackAngleRadians * 180) / Math.PI);

        // Calculate the angle difference between Defender's facing angle and the attack origin angle
        const angleDiff = this.getAngleDifference(defender.facingAngleDegrees, attackAngleDegrees);

        // Determine hit sector
        // Defender faces X. An attack from directly behind has an angle difference of ~180 degrees.
        // Backstab cone: 180 +/- 60 degrees (120 to 240 deg from facing) => angleDiff >= 120
        // Flank cone: +/- 60 to 120 degrees from facing => angleDiff >= 60 and < 120
        // Frontal cone: +/- 60 degrees from facing => angleDiff < 60

        let vectorType: AttackVectorType = "FRONTAL";
        let damageMultiplier = 1.0;
        let bonusCriticalChance = 0.0;
        let defenderBonusBlockChance = 0.0;

        if (angleDiff >= 135) {
            // Tightened Backstab cone (90 degrees total, 45 each side of perfect rear)
            vectorType = "BACKSTAB";
            damageMultiplier = 1.40; // +40% damage
            bonusCriticalChance = 0.25; // +25% flat crit chance
        } else if (angleDiff >= 60) {
            // Flank cone
            vectorType = "FLANK";
            damageMultiplier = 1.15; // +15% damage
            bonusCriticalChance = 0.05; // +5% flat crit chance
        } else {
            // Frontal assault
            vectorType = "FRONTAL";
            damageMultiplier = 1.0;
            defenderBonusBlockChance = 0.15; // +15% flat block/parry chance for defender
        }

        return {
            vectorType,
            damageMultiplier,
            bonusCriticalChance,
            defenderBonusBlockChance,
        };
    }
}
import crypto from "node:crypto";

/**
 * Shadow Rogue Stealth, Backstab Flanking & Smoke Bomb Concealment Engine for OpenAO MMORPG.
 * Simulates rogue invisibility cloaking, sentry true-sight detection radii,
 * positional backstab rear-arc multipliers (2.5x critical damage), and smoke bomb tactical concealment.
 */

export type RogueStealthState = "UNSTEALTHED" | "IN_STEALTH" | "SMOKE_CONCEALED" | "SHADOW_STEP_TELEPORTING";

export interface RogueCombatant {
    playerId: string;
    stealthState: RogueStealthState;
    location: { x: number; y: number };
    facingDegrees: number; // 0 to 360 degrees (0 = North, 90 = East, 180 = South, 270 = West)
    baseDaggerDamage: number;
    stealthDurationSeconds: number;
    stealthStartedEpochMs: number;
}

export interface SentryTarget {
    targetId: string;
    location: { x: number; y: number };
    facingDegrees: number;
    detectionRadiusTiles: number;
    currentHp: number;
    maxHp: number;
    armorRating: number;
}

export class ShadowRogueStealthAssassinationEngine {
    /**
     * Activates rogue stealth cloaking.
     */
    public static enterStealth(
        rogue: RogueCombatant,
        durationSeconds = 30,
        currentEpochMs = Date.now()
    ): { success: boolean; stealthState: RogueStealthState; durationSeconds: number } {
        if (!rogue) {
            return { success: false, stealthState: "UNSTEALTHED", durationSeconds: 0 };
        }

        const dur = Number.isFinite(durationSeconds) ? Math.max(5, durationSeconds) : 30;
        rogue.stealthState = "IN_STEALTH";
        rogue.stealthDurationSeconds = dur;
        rogue.stealthStartedEpochMs = currentEpochMs;

        return {
            success: true,
            stealthState: rogue.stealthState,
            durationSeconds: dur,
        };
    }

    /**
     * Checks if a sentry spots the rogue based on distance and facing angle.
     */
    public static checkSentryDetection(
        rogue: RogueCombatant,
        sentry: SentryTarget,
        currentEpochMs = Date.now()
    ): { isDetected: boolean; reason?: string } {
        if (!rogue || rogue.stealthState === "UNSTEALTHED") return { isDetected: true };
        if (rogue.stealthState === "SMOKE_CONCEALED") return { isDetected: false }; // Smoke grants absolute concealment

        // Check if stealth expired
        const elapsed = (currentEpochMs - rogue.stealthStartedEpochMs) / 1000;
        if (elapsed >= rogue.stealthDurationSeconds) {
            rogue.stealthState = "UNSTEALTHED";
            return { isDetected: true, reason: "Stealth duration expired." };
        }

        const dx = rogue.location.x - sentry.location.x;
        const dy = rogue.location.y - sentry.location.y;
        const dist = Math.hypot(dx, dy);

        if (dist <= sentry.detectionRadiusTiles) {
            rogue.stealthState = "UNSTEALTHED";
            return { isDetected: true, reason: "Entered sentry true-sight perimeter." };
        }

        return { isDetected: false };
    }

    /**
     * Determines if the attacker is positioned behind the target within the 90-degree rear arc.
     */
    public static isBackstabPosition(
        attackerLoc: { x: number; y: number },
        targetLoc: { x: number; y: number },
        targetFacingDeg: number
    ): boolean {
        const dx = attackerLoc.x - targetLoc.x;
        const dy = attackerLoc.y - targetLoc.y;
        if (dx === 0 && dy === 0) return true;

        // Angle from target to attacker in degrees (0 = North)
        let angleToAttacker = (Math.atan2(dx, -dy) * 180) / Math.PI;
        if (angleToAttacker < 0) angleToAttacker += 360;

        // Target's rear vector is facing + 180
        const rearAngle = (targetFacingDeg + 180) % 360;
        let diff = Math.abs(angleToAttacker - rearAngle);
        if (diff > 180) diff = 360 - diff;

        // Within 45 degrees of exact rear
        return diff <= 45;
    }

    /**
     * Executes backstab assassination attack, applying 2.5x stealth multiplier if behind target.
     */
    public static executeBackstab(
        rogue: RogueCombatant,
        target: SentryTarget
    ): { success: boolean; damageDealt: number; isBackstabCritical: boolean; remainingTargetHp: number; reason?: string } {
        if (!rogue || !target || target.currentHp <= 0) {
            return { success: false, damageDealt: 0, isBackstabCritical: false, remainingTargetHp: target?.currentHp ?? 0, reason: "Invalid rogue or target." };
        }

        const isRear = this.isBackstabPosition(rogue.location, target.location, target.facingDegrees);
        let multiplier = 1.0;

        if (isRear && rogue.stealthState === "IN_STEALTH") {
            multiplier = 2.50; // +150% backstab crit
        } else if (isRear) {
            multiplier = 1.40; // +40% unstealthed flank
        }

        const armor = Number.isFinite(target.armorRating) ? Math.max(0, target.armorRating) : 0;
        const armorMitigation = 100 / (100 + armor);

        const damageDealt = Math.max(20, Math.floor(rogue.baseDaggerDamage * multiplier * armorMitigation));
        target.currentHp = Math.max(0, target.currentHp - damageDealt);

        // Break stealth on attack
        rogue.stealthState = "UNSTEALTHED";

        return {
            success: true,
            damageDealt,
            isBackstabCritical: isRear && multiplier >= 2.0,
            remainingTargetHp: target.currentHp,
        };
    }

    /**
     * Deploys smoke bomb, breaking line-of-sight and concealing rogue.
     */
    public static deploySmokeBomb(
        rogue: RogueCombatant,
        currentEpochMs = Date.now()
    ): { success: boolean; stealthState: RogueStealthState; concealmentSeconds: number } {
        if (!rogue) return { success: false, stealthState: "UNSTEALTHED", concealmentSeconds: 0 };

        rogue.stealthState = "SMOKE_CONCEALED";
        rogue.stealthDurationSeconds = 8;
        rogue.stealthStartedEpochMs = currentEpochMs;

        return {
            success: true,
            stealthState: rogue.stealthState,
            concealmentSeconds: 8,
        };
    }
}
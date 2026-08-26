/**
 * Character Stamina & Metabolism Dynamics Engine for OpenAO MMORPG.
 * Simulates activity costs, constitution scaling, weight encumbrance penalties,
 * resting/meditating recovery, and exhaustion debuffs.
 */

export type CharacterActivity =
    | "MEDITATING"
    | "RESTING_SITTING"
    | "STANDING_IDLE"
    | "WALKING"
    | "RUNNING_SPRINTING"
    | "COMBAT_ACTION"
    | "SWIMMING";

export interface StaminaParameters {
    currentStamina: number;
    maxStamina: number;
    constitution: number; // 1 to 30
    currentWeight: number;
    maxWeightCapacity: number;
    isExhausted: boolean;
}

export interface StaminaTickResult {
    newStamina: number;
    delta: number;
    isExhausted: boolean;
    canSprint: boolean;
    speedMultiplier: number;
}

export class StaminaDynamicsEngine {
    public static calculateMaxStamina(constitution: number, level = 1): number {
        // Base stamina formula: 50 + (constitution * 4) + (level * 2)
        return Math.floor(50 + constitution * 4 + level * 2);
    }

    public static calculateEncumbranceMultiplier(currentWeight: number, maxWeight: number): number {
        if (maxWeight <= 0) return 1.0;
        const ratio = currentWeight / maxWeight;

        if (ratio <= 0.75) {
            return 1.0; // Normal load
        }
        if (ratio <= 1.0) {
            // Slight encumbrance (1.0 to 1.5x depletion)
            return 1.0 + (ratio - 0.75) * 2.0;
        }

        // Heavy encumbrance (> 100% capacity)
        return 1.5 + (ratio - 1.0) * 4.0;
    }

    public static tickStamina(
        params: StaminaParameters,
        activity: CharacterActivity,
        elapsedSeconds = 1.0
    ): StaminaTickResult {
        const encumbrance = this.calculateEncumbranceMultiplier(
            params.currentWeight,
            params.maxWeightCapacity
        );

        let baseRatePerSec = 0; // Positive = recovery, Negative = depletion

        switch (activity) {
            case "MEDITATING":
                baseRatePerSec = 8.0 + params.constitution * 0.3;
                break;
            case "RESTING_SITTING":
                baseRatePerSec = 5.0 + params.constitution * 0.2;
                break;
            case "STANDING_IDLE":
                baseRatePerSec = 2.0 + params.constitution * 0.1;
                break;
            case "WALKING":
                baseRatePerSec = 0.5; // Slow recovery
                break;
            case "RUNNING_SPRINTING":
                baseRatePerSec = -4.5 * encumbrance;
                break;
            case "COMBAT_ACTION":
                baseRatePerSec = -3.0 * encumbrance;
                break;
            case "SWIMMING":
                baseRatePerSec = -5.0 * encumbrance;
                break;
        }

        let delta = baseRatePerSec * elapsedSeconds;
        let newStamina = Math.max(0, Math.min(params.maxStamina, params.currentStamina + delta));

        let isExhausted = params.isExhausted;
        if (newStamina <= 0) {
            isExhausted = true;
        } else if (isExhausted && newStamina >= params.maxStamina * 0.2) {
            // Recovered from exhaustion after 20% stamina
            isExhausted = false;
        }

        const canSprint = !isExhausted && newStamina > 5;
        const speedMultiplier = isExhausted ? 0.6 : 1.0;

        return {
            newStamina: Math.round(newStamina * 100) / 100,
            delta: Math.round(delta * 100) / 100,
            isExhausted,
            canSprint,
            speedMultiplier,
        };
    }
}
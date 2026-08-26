/**
 * Combat Armor Penetration, Elemental Resistance & Damage Mitigation Engine for OpenAO MMORPG.
 * Simulates physical armor penetration curves, magic resistance thresholds, and true damage.
 */

export type DamageType = "PHYSICAL" | "MAGIC_FIRE" | "MAGIC_ICE" | "MAGIC_LIGHTNING" | "POISON" | "TRUE_DAMAGE";

export interface AttackerCombatStats {
    level: number;
    rawDamage: number;
    damageType: DamageType;
    flatArmorPenetration: number;
    percentArmorPenetration: number; // 0.0 to 1.0
    criticalMultiplier?: number; // default 1.5
    isCriticalHit?: boolean;
}

export interface DefenderCombatStats {
    level: number;
    physicalArmor: number;
    elementalResistances: {
        fireResist: number; // 0 to 100 (%)
        iceResist: number;
        lightningResist: number;
        poisonResist: number;
    };
    vulnerabilityMultiplier?: number; // e.g. 1.2 = +20% extra damage taken
}

export interface DamageCalculationResult {
    rawDamage: number;
    effectiveArmor: number;
    mitigationPercentage: number;
    damageMitigated: number;
    finalDamageDealt: number;
    isCritical: boolean;
}

export class CombatMitigationEngine {
    /**
     * Computes the effective armor value after applying flat and percentage penetration.
     */
    public static calculateEffectiveArmor(
        rawArmor: number,
        flatPen: number,
        percentPen: number
    ): number {
        // Order of operations: Flat armor reduction -> Percentage armor penetration
        const afterFlat = Math.max(0, rawArmor - flatPen);
        const effective = afterFlat * (1.0 - Math.min(1.0, Math.max(0, percentPen)));
        return Math.max(0, effective);
    }

    /**
     * Computes damage reduction fraction from physical armor: Armor / (Armor + K + AttackerLevel * 10).
     */
    public static calculatePhysicalMitigation(
        effectiveArmor: number,
        attackerLevel: number
    ): number {
        const kConstant = 100 + attackerLevel * 10;
        return effectiveArmor / (effectiveArmor + kConstant);
    }

    /**
     * Resolves end-to-end combat hit damage calculation.
     */
    public static resolveDamage(
        attacker: AttackerCombatStats,
        defender: DefenderCombatStats
    ): DamageCalculationResult {
        let baseDmg = attacker.rawDamage;

        // Apply critical strike multiplier if applicable
        const isCritical = Boolean(attacker.isCriticalHit);
        if (isCritical) {
            baseDmg *= attacker.criticalMultiplier ?? 1.5;
        }

        // True damage bypasses all mitigation
        if (attacker.damageType === "TRUE_DAMAGE") {
            const vuln = defender.vulnerabilityMultiplier ?? 1.0;
            const finalDmg = Math.round(baseDmg * vuln);
            return {
                rawDamage: attacker.rawDamage,
                effectiveArmor: 0,
                mitigationPercentage: 0,
                damageMitigated: 0,
                finalDamageDealt: finalDmg,
                isCritical,
            };
        }

        let mitigationFrac = 0;
        let effectiveArmor = 0;

        if (attacker.damageType === "PHYSICAL") {
            effectiveArmor = this.calculateEffectiveArmor(
                defender.physicalArmor,
                attacker.flatArmorPenetration,
                attacker.percentArmorPenetration
            );
            mitigationFrac = this.calculatePhysicalMitigation(effectiveArmor, attacker.level);
        } else {
            // Elemental Magic resistances
            let resistPercent = 0;
            switch (attacker.damageType) {
                case "MAGIC_FIRE":
                    resistPercent = defender.elementalResistances.fireResist;
                    break;
                case "MAGIC_ICE":
                    resistPercent = defender.elementalResistances.iceResist;
                    break;
                case "MAGIC_LIGHTNING":
                    resistPercent = defender.elementalResistances.lightningResist;
                    break;
                case "POISON":
                    resistPercent = defender.elementalResistances.poisonResist;
                    break;
            }
            // Clamped to 85% max resistance cap
            mitigationFrac = Math.min(0.85, Math.max(0, resistPercent / 100));
        }

        const mitigatedAmount = baseDmg * mitigationFrac;
        let afterMitigation = baseDmg - mitigatedAmount;

        // Vulnerability multiplier
        const vuln = defender.vulnerabilityMultiplier ?? 1.0;
        afterMitigation *= vuln;

        const finalDamage = Math.max(1, Math.round(afterMitigation));

        return {
            rawDamage: attacker.rawDamage,
            effectiveArmor: Math.round(effectiveArmor * 100) / 100,
            mitigationPercentage: Math.round(mitigationFrac * 10000) / 100, // e.g. 35.5%
            damageMitigated: Math.round(mitigatedAmount * 100) / 100,
            finalDamageDealt: finalDamage,
            isCritical,
        };
    }
}
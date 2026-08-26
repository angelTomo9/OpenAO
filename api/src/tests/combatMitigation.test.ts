import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CombatMitigationEngine, AttackerCombatStats, DefenderCombatStats } from "../lib/combatMitigation.js";

describe("CombatMitigationEngine Damage & Armor Penetration", () => {
    const baseDefender: DefenderCombatStats = {
        level: 25,
        physicalArmor: 200,
        elementalResistances: {
            fireResist: 40,
            iceResist: 20,
            lightningResist: 0,
            poisonResist: 50,
        },
    };

    it("calculates physical damage reduction and penetration scaling", () => {
        const attacker: AttackerCombatStats = {
            level: 20,
            rawDamage: 100,
            damageType: "PHYSICAL",
            flatArmorPenetration: 50, // 200 - 50 = 150
            percentArmorPenetration: 0.20, // 150 * 0.8 = 120 effective armor
        };

        const result = CombatMitigationEngine.resolveDamage(attacker, baseDefender);
        assert.equal(result.effectiveArmor, 120);
        assert.ok(result.mitigationPercentage > 0);
        assert.ok(result.finalDamageDealt < 100);
        assert.ok(result.finalDamageDealt > 50);
    });

    it("true damage completely ignores armor and elemental resistances", () => {
        const trueDmgAttacker: AttackerCombatStats = {
            level: 20,
            rawDamage: 150,
            damageType: "TRUE_DAMAGE",
            flatArmorPenetration: 0,
            percentArmorPenetration: 0,
        };

        const result = CombatMitigationEngine.resolveDamage(trueDmgAttacker, baseDefender);
        assert.equal(result.finalDamageDealt, 150);
        assert.equal(result.mitigationPercentage, 0);
        assert.equal(result.damageMitigated, 0);
    });

    it("applies critical strike multiplier to elemental spells", () => {
        const critAttacker: AttackerCombatStats = {
            level: 20,
            rawDamage: 100,
            damageType: "MAGIC_FIRE",
            flatArmorPenetration: 0,
            percentArmorPenetration: 0,
            isCriticalHit: true,
            criticalMultiplier: 2.0, // 200 base fire damage
        };

        const result = CombatMitigationEngine.resolveDamage(critAttacker, baseDefender);
        // 40% fire resist on 200 damage = 120 dealt
        assert.equal(result.isCritical, true);
        assert.equal(result.finalDamageDealt, 120);
    });
});
import { describe, it, expect } from "vitest";
import {
    RunicGolemAssemblyEnchantingForgeEngine,
    AssembledCombatGolem,
} from "../lib/runicGolemAssemblyEnchantingForge.js";

describe("RunicGolemAssemblyEnchantingForgeEngine Golem Forging & Overdrive", () => {
    it("assembles Flame Soul Golem with complete chassis frame parts", () => {
        const result = RunicGolemAssemblyEnchantingForgeEngine.assembleGolem(
            "engineer_01",
            ["TITANIUM_EXOSKELETON", "HYDRAULIC_ARTICULATION_SERVO", "ARCANE_POWER_CONDUIT"],
            "FLAME_SOUL_CORE",
            100000
        );

        expect(result.success).toBe(true);
        expect(result.golem).toBeDefined();
        expect(result.golem?.installedCore).toBe("FLAME_SOUL_CORE");
        expect(result.golem?.attackPower).toBe(140); // 60 + 80 Flame core bonus
        expect(result.golem?.currentHp).toBe(1200); // 1000 + 200 Flame core bonus
        expect(result.golem?.coreTemperatureCelsius).toBe(20);
    });

    it("activates overdrive turbine boosting stats and triggers thermal stasis when heat hits 100C", () => {
        const golem: AssembledCombatGolem = {
            golemId: "golem_02",
            engineerPlayerId: "eng_02",
            installedCore: "CHRONO_SOUL_CORE",
            currentHp: 1300,
            maxHp: 1300,
            attackPower: 100,
            armorRating: 45,
            moveSpeed: 150,
            coreTemperatureCelsius: 70, // High temperature
            isOverdriveActive: false,
            isOverheatedInStasis: false,
            isDestroyed: false,
        };

        // Overdrive adds +45C -> 70 + 45 = 115 clamped to 100 -> Thermal stasis
        const odRes = RunicGolemAssemblyEnchantingForgeEngine.activateOverdriveTurbine(golem);
        expect(odRes.success).toBe(true);
        expect(odRes.newTemperature).toBe(100);
        expect(odRes.isOverheated).toBe(true);
        expect(golem.isOverheatedInStasis).toBe(true);

        // Cannot engage overdrive while overheated in stasis
        const blockedOd = RunicGolemAssemblyEnchantingForgeEngine.activateOverdriveTurbine(golem);
        expect(blockedOd.success).toBe(false);
        expect(blockedOd.reason).toContain("thermal stasis");

        // Flush coolant to recover
        const flushRes = RunicGolemAssemblyEnchantingForgeEngine.flushCoolant(golem, 60);
        expect(flushRes.success).toBe(true);
        expect(flushRes.newTemperature).toBe(40);
        expect(flushRes.isStasisCleared).toBe(true);
        expect(golem.isOverheatedInStasis).toBe(false);
    });

    it("rejects assembly with missing chassis components", () => {
        const res = RunicGolemAssemblyEnchantingForgeEngine.assembleGolem(
            "eng",
            ["TITANIUM_EXOSKELETON"], // Only 1 part
            "EARTH_SOUL_CORE"
        );

        expect(res.success).toBe(false);
        expect(res.reason).toContain("Incomplete chassis parts");
    });

    it("rejects activating overdrive when already active", () => {
        const golem: AssembledCombatGolem = {
            golemId: "g",
            engineerPlayerId: "e",
            installedCore: "EARTH_SOUL_CORE",
            currentHp: 1500,
            maxHp: 1500,
            attackPower: 90,
            armorRating: 65,
            moveSpeed: 100,
            coreTemperatureCelsius: 20,
            isOverdriveActive: true,
            isOverheatedInStasis: false,
            isDestroyed: false,
        };

        const duplicateRes = RunicGolemAssemblyEnchantingForgeEngine.activateOverdriveTurbine(golem);
        expect(duplicateRes.success).toBe(false);
        expect(duplicateRes.reason).toContain("already engaged");
    });

    it("guards against destroyed golems and invalid inputs", () => {
        const destroyed: AssembledCombatGolem = {
            golemId: "d",
            engineerPlayerId: "e",
            installedCore: "EARTH_SOUL_CORE",
            currentHp: 0,
            maxHp: 1500,
            attackPower: 0,
            armorRating: 0,
            moveSpeed: 0,
            coreTemperatureCelsius: 20,
            isOverdriveActive: false,
            isOverheatedInStasis: false,
            isDestroyed: true,
        };

        expect(RunicGolemAssemblyEnchantingForgeEngine.activateOverdriveTurbine(destroyed).success).toBe(false);
        expect(RunicGolemAssemblyEnchantingForgeEngine.flushCoolant(destroyed).success).toBe(false);
    });
});
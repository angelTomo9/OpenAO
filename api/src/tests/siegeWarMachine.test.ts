import { describe, it, expect } from "vitest";
import { SiegeWarMachineEngine } from "../lib/siegeWarMachine.js";

describe("SiegeWarMachineEngine Fortification Assault & Ammo Multipliers", () => {
    it("deploys siege machine with initial max HP and supported ammunition", () => {
        const machine = SiegeWarMachineEngine.deployMachine("catapult_01", "CATAPULT", "guild_order", "player_gunner");
        expect(machine.currentHp).toBe(2000);
        expect(machine.machineType).toBe("CATAPULT");
        expect(machine.loadedAmmo).toBe("HEAVY_BOULDER");
    });

    it("applies 2x fire damage bonus against wooden gates", () => {
        const machine = SiegeWarMachineEngine.deployMachine("catapult_01", "CATAPULT", "guild_order");
        machine.loadedAmmo = "FIRE_POT";

        // Wooden gate with 0 armor and 2000 HP: base 800 * 2.0 = 1600 damage
        const result = SiegeWarMachineEngine.fireAtStructure(machine, 2000, 0, "WOODEN_GATE", 100000);
        expect(result.damageDealt).toBe(1600);
        expect(result.wasEffectiveMaterialBonus).toBe(true);
        expect(result.remainingStructureHp).toBe(400);
    });

    it("mitigates siege damage through fortified gate armor", () => {
        const machine = SiegeWarMachineEngine.deployMachine("ram_01", "BATTERING_RAM", "guild_order");

        // 1200 base damage against 100 armor -> 1200 * (100 / 200) = 600 damage
        const result = SiegeWarMachineEngine.fireAtStructure(machine, 1000, 100, "REINFORCED_IRON_GATE", 100000);
        expect(result.damageDealt).toBe(600);
        expect(result.remainingStructureHp).toBe(400);
    });
});
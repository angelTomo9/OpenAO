import { describe, it, expect } from "vitest";
import {
    DragonRidingAirborneAerialEngine,
    ActiveDragonMount,
} from "../lib/dragonRidingAirborneAerial.js";

describe("DragonRidingAirborneAerialEngine Flight, Stamina & Breath Weapons", () => {
    it("summons an Infernal Drake and ascends to HIGH_ALTITUDE_FLIGHT", () => {
        const drake = DragonRidingAirborneAerialEngine.summonDragon("rider_01", "INFERNAL_DRAKE", 100000);
        expect(drake.altitudeState).toBe("GROUNDED");
        expect(drake.currentStamina).toBe(100);

        const ascendRes = DragonRidingAirborneAerialEngine.changeAltitude(drake, "HIGH_ALTITUDE_FLIGHT", 250, 100000);
        expect(ascendRes.success).toBe(true);
        expect(drake.altitudeState).toBe("HIGH_ALTITUDE_FLIGHT");
        expect(drake.altitudeMeters).toBe(250);
    });

    it("drains stamina during high altitude flight and triggers EMERGENCY_GLIDE_LANDING at 0 stamina", () => {
        const drake = DragonRidingAirborneAerialEngine.summonDragon("rider_01", "INFERNAL_DRAKE", 100000);
        drake.currentStamina = 20;
        drake.altitudeState = "HIGH_ALTITUDE_FLIGHT";
        drake.altitudeMeters = 300;
        drake.lastStaminaDecayEpochMs = 100000;

        // Advance 5 seconds: 5 * 5 = 25 drain -> 0 stamina -> Emergency glide landing
        const updateRes = DragonRidingAirborneAerialEngine.updateFlightStamina(drake, 105000);
        expect(updateRes.isForcedLanding).toBe(true);
        expect(drake.altitudeState).toBe("EMERGENCY_GLIDE_LANDING");
        expect(drake.currentStamina).toBe(0);
        expect(drake.altitudeMeters).toBeLessThanOrEqual(15);
    });

    it("channels breath weapon dealing mitigated damage and consuming stamina", () => {
        const wyvern = DragonRidingAirborneAerialEngine.summonDragon("rider_02", "STORM_WYVERN", 100000);
        // Wyvern base 400 dmg, target armor 50 -> 400 * (100 / 150) = 266 dmg
        const breathRes = DragonRidingAirborneAerialEngine.breathWeaponAttack(wyvern, 50);

        expect(breathRes.success).toBe(true);
        expect(breathRes.damageDealt).toBe(266);
        expect(breathRes.remainingStamina).toBe(70); // 90 - 20 = 70
    });

    it("rejects breath weapon and high altitude ascent when stamina is insufficient", () => {
        const frostDragon = DragonRidingAirborneAerialEngine.summonDragon("rider_03", "FROST_DRAGON", 100000);
        frostDragon.currentStamina = 10;

        const ascendRes = DragonRidingAirborneAerialEngine.changeAltitude(frostDragon, "HIGH_ALTITUDE_FLIGHT", 200, 100000);
        expect(ascendRes.success).toBe(false);
        expect(ascendRes.reason).toContain("Insufficient stamina");

        const breathRes = DragonRidingAirborneAerialEngine.breathWeaponAttack(frostDragon, 0);
        expect(breathRes.success).toBe(false);
        expect(breathRes.reason).toContain("Insufficient stamina to channel breath weapon");
    });

    it("guards against unsupported dragon species", () => {
        expect(() => DragonRidingAirborneAerialEngine.summonDragon("r", "SPACE_DRAGON" as any)).toThrow(
            "Unsupported dragon species"
        );
    });
});
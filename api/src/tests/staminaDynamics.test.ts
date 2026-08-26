import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { StaminaDynamicsEngine, StaminaParameters } from "../lib/staminaDynamics.js";

describe("StaminaDynamicsEngine Activity & Encumbrance", () => {
    it("recovers stamina rapidly while resting or meditating", () => {
        const params: StaminaParameters = {
            currentStamina: 20,
            maxStamina: 100,
            constitution: 18,
            currentWeight: 10,
            maxWeightCapacity: 50,
            isExhausted: false,
        };

        const result = StaminaDynamicsEngine.tickStamina(params, "MEDITATING", 2.0);
        assert.ok(result.newStamina > 20);
        assert.ok(result.delta > 0);
        assert.equal(result.isExhausted, false);
    });

    it("depletes stamina while sprinting with heavy encumbrance penalties", () => {
        const normalParams: StaminaParameters = {
            currentStamina: 100,
            maxStamina: 100,
            constitution: 15,
            currentWeight: 20,
            maxWeightCapacity: 50,
            isExhausted: false,
        };

        const heavyParams: StaminaParameters = {
            ...normalParams,
            currentWeight: 60, // Over 100% capacity
        };

        const normalRes = StaminaDynamicsEngine.tickStamina(normalParams, "RUNNING_SPRINTING", 1.0);
        const heavyRes = StaminaDynamicsEngine.tickStamina(heavyParams, "RUNNING_SPRINTING", 1.0);

        // Heavy encumbrance should lose stamina faster
        assert.ok(heavyRes.newStamina < normalRes.newStamina);
    });

    it("triggers exhaustion debuff at zero stamina and recovers above 20%", () => {
        const lowParams: StaminaParameters = {
            currentStamina: 2,
            maxStamina: 100,
            constitution: 10,
            currentWeight: 10,
            maxWeightCapacity: 50,
            isExhausted: false,
        };

        // Sprinting from 2 stamina triggers exhaustion
        const exhaustRes = StaminaDynamicsEngine.tickStamina(lowParams, "RUNNING_SPRINTING", 1.0);
        assert.equal(exhaustRes.newStamina, 0);
        assert.equal(exhaustRes.isExhausted, true);
        assert.equal(exhaustRes.speedMultiplier, 0.6);
        assert.equal(exhaustRes.canSprint, false);

        // Recovering up to 25 stamina clears exhaustion
        const recoveredRes = StaminaDynamicsEngine.tickStamina(
            { ...lowParams, currentStamina: 15, isExhausted: true },
            "MEDITATING",
            2.0
        );
        assert.ok(recoveredRes.newStamina >= 20);
        assert.equal(recoveredRes.isExhausted, false);
        assert.equal(recoveredRes.speedMultiplier, 1.0);
    });
});
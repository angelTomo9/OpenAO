import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { FishingEngine, FishingRod, FishingBait } from "../lib/fishingEngine.js";

describe("FishingEngine Water Habitats & Catch Rates", () => {
    const basicRod: FishingRod = {
        rodId: "rod_cane_01",
        name: "Simple Wooden Rod",
        tier: 1,
        bonusCatchPercent: 0.0,
    };

    it("catches river fish with basic skill", () => {
        const res = FishingEngine.attemptFishing({
            fishingSkill: 15,
            rod: basicRod,
            waterType: "FRESHWATER_RIVER",
            isNightTime: false,
            rng: () => 0.05, // High success roll
        });

        assert.equal(res.success, true);
        assert.equal(res.caughtFish?.speciesId, "carp_river");
        assert.ok(res.skillExpGained > 0);
    });

    it("restricts nocturnal shadow eels to nighttime conditions", () => {
        // Daytime attempt at Coastal Ocean with high skill
        const dayRes = FishingEngine.attemptFishing({
            fishingSkill: 60,
            rod: basicRod,
            waterType: "COASTAL_OCEAN",
            isNightTime: false,
            rng: () => 0.05,
        });
        assert.equal(dayRes.caughtFish?.speciesId, "salmon_ocean");

        // Nighttime attempt allows Shadow Eel
        let callCount = 0;
        const rolls = [0.05, 0.90]; // First roll passes bite check, second roll picks nocturnal eel
        const nightRes = FishingEngine.attemptFishing({
            fishingSkill: 60,
            rod: basicRod,
            waterType: "COASTAL_OCEAN",
            isNightTime: true,
            rng: () => rolls[callCount++ % rolls.length],
        });
        assert.equal(nightRes.success, true);
        assert.equal(nightRes.caughtFish?.speciesId, "shadow_eel");
    });

    it("boosts sunken treasure chest chances with rare bait in deep sea", () => {
        const rareBait: FishingBait = {
            baitId: "bait_glow_shrimp",
            name: "Luminescent Shrimp",
            potency: 3,
            attractsRare: true,
        };

        const res = FishingEngine.attemptFishing({
            fishingSkill: 80,
            rod: { ...basicRod, tier: 4, bonusCatchPercent: 0.15 },
            bait: rareBait,
            waterType: "DEEP_SEA",
            isNightTime: true,
            rng: () => 0.01,
        });

        assert.equal(res.success, true);
    });
});
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DungeonInstanceKeyGenerator, InstanceKeyParams } from "../lib/instanceKeyGenerator.js";

describe("DungeonInstanceKeyGenerator Refined Cryptography", () => {
    const validParams: InstanceKeyParams = {
        dungeonId: "sunken_temple_01",
        difficulty: "HEROIC",
        partyLeaderId: "char_mage_99",
        partySize: 4,
        createdAtEpochMs: 1787740000000,
    };

    it("generates deterministic 128-bit signature key and verifies successfully", () => {
        const key = DungeonInstanceKeyGenerator.generateInstanceKey(validParams);
        assert.ok(key.startsWith("inst_sunken_temple_01:HEROIC:char_mage_99:4:1787740000000:"));
        
        const isValid = DungeonInstanceKeyGenerator.verifyInstanceKey(key, validParams);
        assert.equal(isValid, true);
    });

    it("safely handles length-mismatched or tampered keys without throwing exceptions", () => {
        const key = DungeonInstanceKeyGenerator.generateInstanceKey(validParams);
        
        // Mismatched length key (e.g. truncated or different parameters)
        assert.equal(DungeonInstanceKeyGenerator.verifyInstanceKey("short_key", validParams), false);
        assert.equal(DungeonInstanceKeyGenerator.verifyInstanceKey(key + "_extra_bytes", validParams), false);
        
        // Tampered parameters
        const tamperedParams = { ...validParams, difficulty: "MYTHIC" as const };
        assert.equal(DungeonInstanceKeyGenerator.verifyInstanceKey(key, tamperedParams), false);
    });

    it("computes party and difficulty scaling modifiers", () => {
        const mods = DungeonInstanceKeyGenerator.computeScalingModifiers("MYTHIC", 5);
        assert.ok(mods.healthMultiplier > 3.0);
        assert.ok(mods.damageMultiplier > 2.0);
        assert.equal(mods.lootQualityBonusPercent, 80); // 60 + (4 * 5)
    });
});
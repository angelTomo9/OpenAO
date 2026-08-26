import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DungeonInstanceKeyGenerator, InstanceDescriptor } from "../lib/instanceKeyGenerator.js";

describe("DungeonInstanceKeyGenerator Cryptographic Scaling", () => {
    const secret = "openao_secure_cluster_secret_998127364";
    const descriptor: InstanceDescriptor = {
        dungeonId: "dragon_cavern_tier3",
        partyLeaderId: "char_9812",
        partyMembers: ["char_9812", "char_3321", "char_4412"], // 3 players
        difficulty: "MYTHIC",
        seasonId: 4,
        createdAtEpochMs: 1787740800000,
    };

    it("generates deterministic and reproducible HMAC instance keys", () => {
        const key1 = DungeonInstanceKeyGenerator.generateInstanceKey(descriptor, secret);
        const key2 = DungeonInstanceKeyGenerator.generateInstanceKey(descriptor, secret);

        assert.equal(key1, key2);
        assert.ok(key1.startsWith("inst_dragon_cavern_tier3_MYTHIC_"));
    });

    it("verifies authentic instance keys and rejects tampered keys", () => {
        const key = DungeonInstanceKeyGenerator.generateInstanceKey(descriptor, secret);
        const isValid = DungeonInstanceKeyGenerator.verifyInstanceKey(key, descriptor, secret);
        assert.equal(isValid, true);

        const tamperedDescriptor = { ...descriptor, difficulty: "NORMAL" as const };
        const isTamperedValid = DungeonInstanceKeyGenerator.verifyInstanceKey(key, tamperedDescriptor, secret);
        assert.equal(isTamperedValid, false);
    });

    it("computes party size and Mythic difficulty monster & loot multipliers", () => {
        const scaling = DungeonInstanceKeyGenerator.computeInstanceScaling(descriptor, secret);

        assert.equal(scaling.difficulty, "MYTHIC");
        assert.equal(scaling.monsterLevelBonus, 12);
        assert.equal(scaling.monsterHpMultiplier, 4.7); // 3.5 + 2 * 0.60
        assert.equal(scaling.lootDropRateMultiplier, 3.5);
        assert.equal(scaling.goldDropRateMultiplier, 4.0);
    });
});
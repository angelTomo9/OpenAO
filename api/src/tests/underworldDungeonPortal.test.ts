import { describe, it, expect } from "vitest";
import {
    UnderworldDungeonPortalEngine,
    KeystoneItem,
    DungeonPartyMember,
} from "../lib/underworldDungeonPortal.js";

describe("UnderworldDungeonPortalEngine Keystone Attunement, Deduplication & Scaling", () => {
    const mockKeystone: KeystoneItem = {
        keystoneId: "key_crypt_01",
        dungeonId: "crypt_of_the_damned",
        difficulty: "HEROIC",
        levelModifier: 5,
    };

    const leader: DungeonPartyMember = { playerId: "leader_1", level: 30, hasAttunementKey: true };
    const party: DungeonPartyMember[] = [
        { playerId: "member_2", level: 28, hasAttunementKey: true },
        { playerId: "member_3", level: 32, hasAttunementKey: true },
    ];

    it("opens dungeon portal and deduplicates party members with level scaling", () => {
        // Pass duplicate member_2
        const partyWithDup = [...party, { playerId: "member_2", level: 28, hasAttunementKey: true }];
        const portalRes = UnderworldDungeonPortalEngine.openPortal(mockKeystone, leader, partyWithDup, 100000);

        expect(portalRes.success).toBe(true);
        expect(portalRes.instance?.partyMembers.length).toBe(3); // Deduplicated 3 unique members
        expect(portalRes.instance?.difficulty).toBe("HEROIC");
    });

    it("scales Mythic Keystone duration based on levelModifier", () => {
        const mythicKey: KeystoneItem = {
            keystoneId: "key_abyss_10",
            dungeonId: "abyssal_citadel",
            difficulty: "MYTHIC_KEYSTONE",
            levelModifier: 10, // 45 min base - 5 min (10 / 2) = 40 min = 2,400,000 ms
        };

        const res = UnderworldDungeonPortalEngine.openPortal(mythicKey, { playerId: "l", level: 50, hasAttunementKey: true }, [], 100000);
        expect(res.success).toBe(true);
        expect(res.instance?.expiresAtEpochMs).toBe(100000 + 2400000);
    });

    it("tracks boss chamber lockouts and unlocks upon defeat", () => {
        const instance = UnderworldDungeonPortalEngine.openPortal(mockKeystone, leader, party, 100000).instance!;

        UnderworldDungeonPortalEngine.recordBossEncounter(instance, "LOCK_CHAMBER", 105000);
        expect(instance.isBossChamberLocked).toBe(true);

        UnderworldDungeonPortalEngine.recordBossEncounter(instance, "DEFEAT_BOSS", 110000);
        expect(instance.defeatedBosses).toBe(1);
        expect(instance.isBossChamberLocked).toBe(false);
    });
});
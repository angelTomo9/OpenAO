import { describe, it, expect } from "vitest";
import {
    HuntingBountyBoardEngine,
    BountyContract,
    KillEventLocation,
    PartyMemberLocation,
} from "../lib/huntingBountyBoard.js";

describe("HuntingBountyBoardEngine Kill Tracking & Party Proximity", () => {
    const mockContract: BountyContract = {
        contractId: "bounty_forest_trolls",
        targetMonsterId: "forest_troll_01",
        targetMonsterName: "Forest Troll",
        requiredKillCount: 3,
        rank: "NORMAL",
        rewardGold: 1500,
        rewardReputationPoints: 100,
        rewardExp: 5000,
    };

    it("accepts contract and increments kill progress for nearby party members", () => {
        const p1 = HuntingBountyBoardEngine.acceptContract("player_1", "bounty_forest_trolls");
        const p2 = HuntingBountyBoardEngine.acceptContract("player_2", "bounty_forest_trolls");

        const killLoc: KillEventLocation = { mapId: 1, x: 50, y: 50 };
        const party: PartyMemberLocation[] = [
            { playerId: "player_1", mapId: 1, x: 52, y: 50 }, // In range (2 tiles away)
            { playerId: "player_2", mapId: 1, x: 90, y: 90 }, // Out of range (> 15 tiles away)
        ];

        const updates = HuntingBountyBoardEngine.recordMonsterKill(
            mockContract,
            [p1, p2],
            killLoc,
            party,
            "forest_troll_01"
        );

        expect(updates.length).toBe(1);
        expect(updates[0].playerId).toBe("player_1");
        expect(p1.currentKills).toBe(1);
        expect(p2.currentKills).toBe(0); // Did not get kill credit
    });

    it("completes contract upon reaching required kills and claims reward", () => {
        const p1 = HuntingBountyBoardEngine.acceptContract("player_1", "bounty_forest_trolls");
        p1.currentKills = 2;

        const killLoc: KillEventLocation = { mapId: 1, x: 50, y: 50 };
        const party: PartyMemberLocation[] = [{ playerId: "player_1", mapId: 1, x: 50, y: 50 }];

        HuntingBountyBoardEngine.recordMonsterKill(mockContract, [p1], killLoc, party, "forest_troll_01");

        expect(p1.isCompleted).toBe(true);
        expect(p1.currentKills).toBe(3);

        const claim = HuntingBountyBoardEngine.claimReward(mockContract, p1);
        expect(claim.success).toBe(true);
        expect(claim.goldAwarded).toBe(1500);
        expect(claim.reputationAwarded).toBe(100);
        expect(p1.isClaimed).toBe(true);

        // Cannot claim twice
        const claimAgain = HuntingBountyBoardEngine.claimReward(mockContract, p1);
        expect(claimAgain.success).toBe(false);
    });
});
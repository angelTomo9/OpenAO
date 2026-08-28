import { describe, it, expect } from "vitest";
import {
    GladiatorialColosseumTournamentEngine,
    GladiatorFighter,
} from "../lib/gladiatorialColosseumTournament.js";

describe("GladiatorialColosseumTournamentEngine Deathmatches & Finishing Moves", () => {
    it("creates tournament deathmatch and executes standard attack with armor mitigation", () => {
        const gladiator1: GladiatorFighter = {
            fighterId: "spartacus_01",
            name: "Spartacus",
            currentHp: 1000,
            maxHp: 1000,
            attackPower: 200,
            armorRating: 0,
            crowdFavorScore: 0,
            isEliminated: false,
        };

        const gladiator2: GladiatorFighter = {
            fighterId: "crixus_02",
            name: "Crixus",
            currentHp: 1000,
            maxHp: 1000,
            attackPower: 180,
            armorRating: 25, // 25 armor -> 100/125 = 0.80 multiplier
            crowdFavorScore: 0,
            isEliminated: false,
        };

        const match = GladiatorialColosseumTournamentEngine.createMatch(gladiator1, gladiator2, "SEMIFINAL_CLASH", 100000);
        expect(match.goldPrizePool).toBe(300);
        expect(match.status).toBe("IN_COMBAT");

        // 200 attack * 0.80 armor mitigation = 160 damage
        const attack = GladiatorialColosseumTournamentEngine.executeAttack(gladiator1, gladiator2);
        expect(attack.damageDealt).toBe(160);
        expect(gladiator2.currentHp).toBe(840);
        expect(attack.isFatal).toBe(false);
    });

    it("executes lethal finishing move when opponent health is below 20% granting crowd favor", () => {
        const attacker: GladiatorFighter = {
            fighterId: "g1",
            name: "Maximus",
            currentHp: 800,
            maxHp: 1000,
            attackPower: 300,
            armorRating: 0,
            crowdFavorScore: 10,
            isEliminated: false,
        };

        const weakDefender: GladiatorFighter = {
            fighterId: "g2",
            name: "Commodus",
            currentHp: 150, // 15% HP
            maxHp: 1000,
            attackPower: 100,
            armorRating: 0,
            crowdFavorScore: 0,
            isEliminated: false,
        };

        const finishRes = GladiatorialColosseumTournamentEngine.executeFinishingMove(attacker, weakDefender);
        expect(finishRes.success).toBe(true);
        expect(finishRes.crowdFavorAwarded).toBe(35);
        expect(attacker.crowdFavorScore).toBe(45); // 10 + 35
        expect(weakDefender.isEliminated).toBe(true);
        expect(weakDefender.currentHp).toBe(0);
    });

    it("rejects finishing move when defender health is above 20%", () => {
        const attacker: GladiatorFighter = {
            fighterId: "g1",
            name: "Maximus",
            currentHp: 1000,
            maxHp: 1000,
            attackPower: 200,
            armorRating: 0,
            crowdFavorScore: 0,
            isEliminated: false,
        };

        const healthyDefender: GladiatorFighter = {
            fighterId: "g2",
            name: "Goliath",
            currentHp: 500, // 50% HP
            maxHp: 1000,
            attackPower: 200,
            armorRating: 0,
            crowdFavorScore: 0,
            isEliminated: false,
        };

        const failFinish = GladiatorialColosseumTournamentEngine.executeFinishingMove(attacker, healthyDefender);
        expect(failFinish.success).toBe(false);
        expect(failFinish.reason).toContain("require opponent health to be below 20%");
    });

    it("triggers arena hazard damage and concludes match with champion gold prize", () => {
        const gladiator1: GladiatorFighter = {
            fighterId: "g1",
            name: "Spartacus",
            currentHp: 500,
            maxHp: 500,
            attackPower: 100,
            armorRating: 0,
            crowdFavorScore: 50,
            isEliminated: false,
        };

        const gladiator2: GladiatorFighter = {
            fighterId: "g2",
            name: "Thracian",
            currentHp: 150,
            maxHp: 500,
            attackPower: 100,
            armorRating: 0,
            crowdFavorScore: 0,
            isEliminated: false,
        };

        const match = GladiatorialColosseumTournamentEngine.createMatch(gladiator1, gladiator2, "GRAND_CHAMPIONSHIP", 100000);

        // Fire jet hazard (200 damage) kills gladiator 2
        const hazardRes = GladiatorialColosseumTournamentEngine.triggerArenaHazard(gladiator2, "FIRE_JET");
        expect(hazardRes.damageTaken).toBe(200);
        expect(hazardRes.isSunkenOrEliminated).toBe(true);

        const conclude = GladiatorialColosseumTournamentEngine.concludeMatch(match);
        expect(conclude.success).toBe(true);
        expect(conclude.winnerId).toBe("g1");
        expect(conclude.goldAwarded).toBe(1000);
        expect(match.status).toBe("DECIDED_VICTORY");
    });

    it("guards against unsupported match tiers", () => {
        const g1: any = { fighterId: "1" };
        const g2: any = { fighterId: "2" };

        expect(() => GladiatorialColosseumTournamentEngine.createMatch(g1, g2, "INVALID_TIER" as any)).toThrow(
            "Unsupported match tier"
        );
    });
});
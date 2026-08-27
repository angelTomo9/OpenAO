import { describe, it, expect } from "vitest";
import { RunicSocketGemstoneEngine, SocketedGearItem } from "../lib/runicSocketGemstone.js";

describe("RunicSocketGemstoneEngine Chiseling, Socketing & Stats Aggregation", () => {
    it("chisels a socket and inserts a PERFECT Ruby into a weapon", () => {
        const weapon: SocketedGearItem = {
            itemId: "sword_01",
            slot: "WEAPON",
            totalSockets: 0,
            socketedGems: [],
        };

        // Chisel socket 1 (success roll 0.10)
        const chiselRes = RunicSocketGemstoneEngine.chiselSocket(weapon, false, () => 0.10);
        expect(chiselRes.success).toBe(true);
        expect(weapon.totalSockets).toBe(1);

        // Insert Perfect Ruby (5 * 12 = 60 fireDamage)
        const ruby = RunicSocketGemstoneEngine.createGem("RUBY", "PERFECT");
        const insertRes = RunicSocketGemstoneEngine.insertGem(weapon, 0, ruby);
        expect(insertRes.success).toBe(true);

        const stats = RunicSocketGemstoneEngine.aggregateStats(weapon);
        expect(stats.fireDamage).toBe(60);
    });

    it("prevents destruction when protection scroll is used during failed chisel", () => {
        const armor: SocketedGearItem = {
            itemId: "chestplate_01",
            slot: "ARMOR",
            totalSockets: 1,
            socketedGems: [null],
        };

        // Failed roll (rng = 0.99), but protected
        const res = RunicSocketGemstoneEngine.chiselSocket(armor, true, () => 0.99);
        expect(res.success).toBe(false);
        expect(res.itemDestroyed).toBe(false);
        expect(armor.isDestroyed).toBeFalsy();
    });
});
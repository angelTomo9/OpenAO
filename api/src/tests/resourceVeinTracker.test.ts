import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ResourceVeinTracker, MineralVein } from "../lib/resourceVeinTracker.js";

describe("ResourceVeinTracker Mining & Respawns", () => {
    const mockVein: MineralVein = {
        veinId: "vein_copper_01",
        veinType: "COPPER",
        mapId: 1,
        x: 45,
        y: 60,
        state: "PRISTINE",
        totalOreUnits: 2,
        remainingOreUnits: 2,
        activeMinerPlayerId: null,
        respawnTicksRemaining: 0,
        baseRespawnTicks: 10,
    };

    it("locks and extracts ore with sufficient skill", () => {
        const tracker = new ResourceVeinTracker();
        tracker.registerVein({ ...mockVein });

        const locked = tracker.acquireVeinLock("vein_copper_01", "player_1");
        assert.equal(locked, true);

        // Player 2 cannot lock same vein simultaneously
        const lockedP2 = tracker.acquireVeinLock("vein_copper_01", "player_2");
        assert.equal(lockedP2, false);

        const mineRes = tracker.mineVein("vein_copper_01", {
            playerId: "player_1",
            miningSkill: 50,
            pickaxeTier: 2,
            rng: () => 0.1, // Guaranteed success
        });

        assert.equal(mineRes.success, true);
        assert.equal(mineRes.oreExtracted, 1);
        assert.equal(mineRes.veinDepleted, false);
    });

    it("depletes vein and schedules randomized respawn ticks", () => {
        const tracker = new ResourceVeinTracker();
        tracker.registerVein({ ...mockVein, remainingOreUnits: 1 });

        const mineRes = tracker.mineVein("vein_copper_01", {
            playerId: "player_1",
            miningSkill: 50,
            pickaxeTier: 2,
            rng: () => 0.1, // Guaranteed success
        });

        assert.equal(mineRes.success, true);
        assert.equal(mineRes.veinDepleted, true);

        const vein = tracker.getVein("vein_copper_01")!;
        assert.equal(vein.state, "DEPLETED");
        assert.ok(vein.respawnTicksRemaining > 0);
    });

    it("respawns depleted veins after server tick progression", () => {
        const tracker = new ResourceVeinTracker();
        const depletedVein: MineralVein = {
            ...mockVein,
            state: "DEPLETED",
            remainingOreUnits: 0,
            respawnTicksRemaining: 2,
        };
        tracker.registerVein(depletedVein);

        tracker.tickRespawns();
        assert.equal(tracker.getVein("vein_copper_01")!.state, "DEPLETED");

        const respawned = tracker.tickRespawns();
        assert.equal(respawned, 1);
        assert.equal(tracker.getVein("vein_copper_01")!.state, "PRISTINE");
        assert.equal(tracker.getVein("vein_copper_01")!.remainingOreUnits, 10);
    });
});
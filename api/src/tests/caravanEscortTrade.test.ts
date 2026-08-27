import { describe, it, expect } from "vitest";
import { CaravanEscortTradeEngine, TradeCargoManifest, CaravanWaypoint } from "../lib/caravanEscortTrade.js";

describe("CaravanEscortTradeEngine Route Traversal & Ambush Scaling", () => {
    const mockManifest: TradeCargoManifest = {
        manifestId: "silk_road_01",
        cargoName: "Imperial Silk and Gems",
        cargoValueGold: 40000, // 40k gold -> 10% base + (4 * 5%) = 30% ambush chance
        baseRewardGold: 2000,
    };

    const mockWaypoints: CaravanWaypoint[] = [
        { waypointId: "wp_1", mapId: 1, x: 10, y: 10 },
        { waypointId: "wp_2", mapId: 1, x: 20, y: 20 },
    ];

    it("calculates ambush probability scaled by cargo value", () => {
        const probLow = CaravanEscortTradeEngine.calculateAmbushProbability(5000);
        expect(probLow).toBe(0.10); // Base 10%

        const probHigh = CaravanEscortTradeEngine.calculateAmbushProbability(40000);
        expect(probHigh).toBe(0.30); // 10% + 20% = 30%
    });

    it("completes mission and awards gold when reaching destination inside protection radius", () => {
        const mission = CaravanEscortTradeEngine.startMission("player_1", mockManifest, mockWaypoints, 500);

        // Advance WP 1 (within radius)
        const tick1 = CaravanEscortTradeEngine.advanceWaypoint(mission, { x: 12, y: 10 }, () => 0.99);
        expect(tick1.isCompleted).toBe(false);
        expect(mission.currentWaypointIndex).toBe(1);

        // Advance WP 2 (final destination)
        const tick2 = CaravanEscortTradeEngine.advanceWaypoint(mission, { x: 20, y: 22 }, () => 0.99);
        expect(tick2.isCompleted).toBe(true);
        expect(tick2.rewardGoldAwarded).toBe(2000); // 100% health -> full 2000 payout
    });

    it("pauses progression when player is beyond escort protection radius", () => {
        const mission = CaravanEscortTradeEngine.startMission("player_1", mockManifest, mockWaypoints, 500);

        // Player is at (100, 100) -> distance > 8 tiles
        const tick = CaravanEscortTradeEngine.advanceWaypoint(mission, { x: 100, y: 100 });
        expect(tick.currentWaypointIndex).toBe(0); // Did not advance
        expect(tick.reason).toContain("Escort radius exceeded");
    });
});
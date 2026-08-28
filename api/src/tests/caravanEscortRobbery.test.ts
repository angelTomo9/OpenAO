import { describe, it, expect } from "vitest";
import {
    CaravanEscortRobberyEngine,
    ActiveTradeCaravan,
} from "../lib/caravanEscortRobbery.js";

describe("CaravanEscortRobberyEngine Waypoints, Bandit Ambushes & Depot Delivery", () => {
    it("dispatches a Royal Treasury Carriage and advances waypoints to destination", () => {
        const caravan = CaravanEscortRobberyEngine.dispatchCaravan("merchant_1", "ROYAL_TREASURY_CARRIAGE", 3, 100000);
        expect(caravan.currentHp).toBe(2500);
        expect(caravan.totalWaypoints).toBe(6);
        expect(caravan.status).toBe("IN_TRANSIT");

        for (let i = 0; i < 5; i++) {
            const adv = CaravanEscortRobberyEngine.advanceWaypoint(caravan);
            expect(adv.success).toBe(true);
            expect(adv.isArrived).toBe(false);
        }

        const finalAdv = CaravanEscortRobberyEngine.advanceWaypoint(caravan);
        expect(finalAdv.isArrived).toBe(true);
        expect(caravan.status).toBe("DELIVERED_SUCCESS");
    });

    it("mitigates bandit ambush damage based on hired guard count", () => {
        const caravan = CaravanEscortRobberyEngine.dispatchCaravan("merchant_1", "SILK_ROAD_CONVOY", 4, 100000);
        // 4 guards -> 40% mitigation. 1000 raid power -> 600 damage taken
        const ambush = CaravanEscortRobberyEngine.triggerBanditAmbush(caravan, 1000);

        expect(ambush.success).toBe(true);
        expect(ambush.damageTaken).toBe(600);
        expect(caravan.currentHp).toBe(4400);
        expect(caravan.status).toBe("IN_TRANSIT");
    });

    it("plunders caravan when wagon HP drops to 0", () => {
        const cart = CaravanEscortRobberyEngine.dispatchCaravan("merchant_1", "MERCHANT_SUPPLY_CART", 0, 100000);
        const fatalAmbush = CaravanEscortRobberyEngine.triggerBanditAmbush(cart, 2000);

        expect(fatalAmbush.isPlundered).toBe(true);
        expect(cart.status).toBe("PLUNDERED_FAILURE");
        expect(cart.currentHp).toBe(0);
    });

    it("awards scaled gold payout based on cargo health upon depot delivery", () => {
        const caravan = CaravanEscortRobberyEngine.dispatchCaravan("merchant_1", "ROYAL_TREASURY_CARRIAGE", 2, 100000);
        caravan.currentHp = 2000; // 80% HP (2000/2500)
        caravan.status = "DELIVERED_SUCCESS";

        // Base 500 gold * 0.80 = 400 gold
        const delivery = CaravanEscortRobberyEngine.completeDepotDelivery(caravan);
        expect(delivery.success).toBe(true);
        expect(delivery.goldAwarded).toBe(400);
        expect(delivery.cargoHealthRatio).toBe(0.8);
    });

    it("guards against unsupported caravan tier and unarrived delivery", () => {
        expect(() => CaravanEscortRobberyEngine.dispatchCaravan("p", "PIRATE_SUBMARINE" as any)).toThrow(
            "Unsupported caravan tier"
        );

        const inTransit = CaravanEscortRobberyEngine.dispatchCaravan("p", "MERCHANT_SUPPLY_CART");
        const prematureDelivery = CaravanEscortRobberyEngine.completeDepotDelivery(inTransit);
        expect(prematureDelivery.success).toBe(false);
        expect(prematureDelivery.reason).toContain("not reached the final delivery depot");
    });
});
import { describe, it, expect } from "vitest";
import {
    NavalFleetBlockadeEngine,
    ActiveNavalBlockade,
    InterceptedVessel,
} from "../lib/navalFleetBlockade.js";

describe("NavalFleetBlockadeEngine Fleet Blockades, Harpoons & Broadsides", () => {
    it("establishes an Armored Frigate blockade at Storm Strait", () => {
        const blockade = NavalFleetBlockadeEngine.establishBlockade("admiral_nelson", "ARMORED_FRIGATE", "STORM_STRAIT", 100, 100, 35, 80);
        expect(blockade.warshipClass).toBe("ARMORED_FRIGATE");
        expect(blockade.currentHullHp).toBe(4500);
        expect(blockade.controlRadiusTiles).toBe(35);
        expect(blockade.tollTaxGoldAmount).toBe(80);
    });

    it("verifies blockade zone territory coordinates", () => {
        const blockade = NavalFleetBlockadeEngine.establishBlockade("admiral", "WAR_GALLEON", "SKULL_REEF", 50, 50, 30);

        // Vessel at (60, 50) -> 10 tiles away -> Inside
        expect(NavalFleetBlockadeEngine.isVesselInBlockadeZone(blockade, 60, 50)).toBe(true);

        // Vessel at (150, 50) -> 100 tiles away -> Outside
        expect(NavalFleetBlockadeEngine.isVesselInBlockadeZone(blockade, 150, 50)).toBe(false);
    });

    it("fires harpoon grappling hook to tether vessel inside zone and rejects vessels outside", () => {
        const blockade = NavalFleetBlockadeEngine.establishBlockade("admiral", "DREADNOUGHT_IRONCLAD", "KRAKEN_ABYSS", 0, 0, 40);
        const merchantVessel: InterceptedVessel = {
            vesselId: "vessel_01",
            captainPlayerId: "merchant_tom",
            currentHullHp: 1000,
            maxHullHp: 1000,
            cargoGoldValue: 400,
            isGrappled: false,
            isSunken: false,
        };

        // Grapple within 40 tiles
        const grappleRes = NavalFleetBlockadeEngine.fireHarpoonGrapple(blockade, merchantVessel, 20, 20);
        expect(grappleRes.success).toBe(true);
        expect(merchantVessel.isGrappled).toBe(true);

        // Grapple outside range
        const outRes = NavalFleetBlockadeEngine.fireHarpoonGrapple(blockade, merchantVessel, 200, 200);
        expect(outRes.success).toBe(false);
        expect(outRes.reason).toContain("beyond blockade harpoon perimeter");
    });

    it("fires broadside cannon salvo and salvages 75% cargo when sunken", () => {
        const blockade = NavalFleetBlockadeEngine.establishBlockade("admiral", "DREADNOUGHT_IRONCLAD", "STORM_STRAIT", 0, 0, 50);
        const weakSloop: InterceptedVessel = {
            vesselId: "sloop_01",
            captainPlayerId: "smuggler_1",
            currentHullHp: 400,
            maxHullHp: 400,
            cargoGoldValue: 600,
            isGrappled: true,
            isSunken: false,
        };

        // Dreadnought base 550 cannon power vs 0 armor -> 550 damage -> Sinks sloop
        const salvoRes = NavalFleetBlockadeEngine.fireBroadsideSalvo(blockade, weakSloop, 0);
        expect(salvoRes.success).toBe(true);
        expect(salvoRes.isSunken).toBe(true);
        expect(weakSloop.isSunken).toBe(true);
        expect(salvoRes.plunderGoldAwarded).toBe(450); // 75% of 600
    });

    it("guards against unsupported warship classes", () => {
        expect(() => NavalFleetBlockadeEngine.establishBlockade("a", "SPACE_CARRIER" as any, "STORM_STRAIT")).toThrow(
            "Unsupported warship class"
        );
    });
});
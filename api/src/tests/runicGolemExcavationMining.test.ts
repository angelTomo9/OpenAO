import { describe, it, expect } from "vitest";
import {
    RunicGolemExcavationMiningEngine,
    ActiveMiningGolem,
} from "../lib/runicGolemExcavationMining.js";

describe("RunicGolemExcavationMiningEngine Golem Miners & Ore Carts", () => {
    it("deploys Adamantine Deep Miner and extracts ores over time", () => {
        const golem = RunicGolemExcavationMiningEngine.deployMiningGolem("miner_01", "ADAMANTINE_DEEP_MINER", "ADAMANTINE_ORE", 100000);
        expect(golem.chassisType).toBe("ADAMANTINE_DEEP_MINER");
        expect(golem.currentDurabilityHp).toBe(3500);
        expect(golem.bedrockStabilityPercent).toBe(100);

        // 2 minutes mining (12 ore/min -> 24 Adamantine ores)
        const tickRes = RunicGolemExcavationMiningEngine.executeExcavationTick(golem, 2);
        expect(tickRes.success).toBe(true);
        expect(tickRes.oreExtractedCount).toBe(24);
        expect(golem.accumulatedOreCount).toBe(24);
        expect(tickRes.currentStability).toBe(60); // 100 - (20 * 2) = 60
        expect(tickRes.isCaveIn).toBe(false);
    });

    it("triggers subterranean cave-in when stability drops to 0", () => {
        const golem = RunicGolemExcavationMiningEngine.deployMiningGolem("miner_02", "IRON_ORE_DRILLER", "IRON_ORE", 100000);
        golem.bedrockStabilityPercent = 10; // Low stability

        const tickRes = RunicGolemExcavationMiningEngine.executeExcavationTick(golem, 1); // Drains 10 -> drops to 0
        expect(tickRes.isCaveIn).toBe(true);
        expect(golem.isCollapsedByCaveIn).toBe(true);
        expect(golem.currentDurabilityHp).toBe(500); // 1000 - 500 cave-in damage

        // Further mining fails while collapsed
        const blockedTick = RunicGolemExcavationMiningEngine.executeExcavationTick(golem, 1);
        expect(blockedTick.success).toBe(false);
        expect(blockedTick.reason).toContain("collapsed");
    });

    it("reinforces shaft stability and resumes drilling", () => {
        const golem = RunicGolemExcavationMiningEngine.deployMiningGolem("m", "IRON_ORE_DRILLER", "IRON_ORE", 100000);
        golem.isCollapsedByCaveIn = true;
        golem.bedrockStabilityPercent = 0;

        const reinforce = RunicGolemExcavationMiningEngine.reinforceShaftStability(golem, 70);
        expect(reinforce.success).toBe(true);
        expect(golem.bedrockStabilityPercent).toBe(70);
        expect(golem.isCollapsedByCaveIn).toBe(false);

        const resumeTick = RunicGolemExcavationMiningEngine.executeExcavationTick(golem, 1);
        expect(resumeTick.success).toBe(true);
    });

    it("dispatches cart delivery to bank vault awarding gold payout", () => {
        const golem = RunicGolemExcavationMiningEngine.deployMiningGolem("m", "MITHRIL_VEIN_CARVER", "ANCIENT_ASTRAL_GEODE", 100000);
        golem.accumulatedOreCount = 10; // 10 Geodes @ 150 gold each = 1500 gold

        const delivery = RunicGolemExcavationMiningEngine.dispatchCartDelivery(golem);
        expect(delivery.success).toBe(true);
        expect(delivery.totalGoldPayout).toBe(1500);
        expect(delivery.oresDeliveredCount).toBe(10);
        expect(golem.accumulatedOreCount).toBe(0);
    });

    it("guards against unsupported chassis and empty cart deliveries", () => {
        expect(() => RunicGolemExcavationMiningEngine.deployMiningGolem("m", "QUANTUM_DRILLER" as any, "IRON_ORE")).toThrow(
            "Unsupported golem chassis type"
        );

        const emptyGolem = RunicGolemExcavationMiningEngine.deployMiningGolem("m", "IRON_ORE_DRILLER", "IRON_ORE");
        const emptyDelivery = RunicGolemExcavationMiningEngine.dispatchCartDelivery(emptyGolem);
        expect(emptyDelivery.success).toBe(false);
        expect(emptyDelivery.reason).toContain("No accumulated ore");
    });
});
import { describe, it, expect } from "vitest";
import {
    AncientRunicFarmingAgricultureHarvestingEngine,
    ActiveFarmingPlot,
} from "../lib/ancientRunicFarmingAgricultureHarvesting.js";

describe("AncientRunicFarmingAgricultureHarvestingEngine Agriculture & Hydroponics", () => {
    it("plants Starfall Lotus in Astral Greenhouse, speeds growth by 2.5x, and harvests 100% quality celestial produce", () => {
        const greenhouse = AncientRunicFarmingAgricultureHarvestingEngine.constructPlot("farmer_01", "ASTRAL_GREENHOUSE_TIER", 100000);
        expect(greenhouse.plotType).toBe("ASTRAL_GREENHOUSE_TIER");
        expect(greenhouse.currentWater).toBe(350);

        // Plant seeds: 2.5x growth speed (360s / 2.5 = 144s), 100% fertilizer quality
        const plantRes = AncientRunicFarmingAgricultureHarvestingEngine.plantSeeds(
            greenhouse,
            "STARFALL_LOTUS",
            0.5,
            100000
        );

        expect(plantRes.success).toBe(true);
        expect(plantRes.plantedStage).toBe("SEED");
        expect(greenhouse.currentWater).toBe(330); // 350 - 20
        expect(greenhouse.plantedCrop?.remainingGrowthSeconds).toBe(144);
        expect(greenhouse.plantedCrop?.fertilizerQualityPercent).toBe(100); // 50 + 15 + 35 = 100

        // Tick 144 seconds
        const tickRes = AncientRunicFarmingAgricultureHarvestingEngine.tickCropGrowth(greenhouse, 144);
        expect(tickRes.stage).toBe("MATURE_HARVESTABLE");
        expect(tickRes.isReadyForHarvest).toBe(true);

        // Harvest: 15 base * 1.20 = 18 Starfall Blossoms, 9 Celestial Pollen
        const harvestRes = AncientRunicFarmingAgricultureHarvestingEngine.harvestCrop(greenhouse, 100000);
        expect(harvestRes.success).toBe(true);
        expect(harvestRes.result?.cropType).toBe("STARFALL_LOTUS");
        expect(harvestRes.result?.harvestedItemCount).toBe(18);
        expect(harvestRes.result?.secondaryProduceCount).toBe(9);
        expect(harvestRes.result?.produceQualityPercent).toBe(100);
        expect(greenhouse.plantedCrop).toBeUndefined(); // Plot is clear
    });

    it("rejects planting when plot is already occupied", () => {
        const plot = AncientRunicFarmingAgricultureHarvestingEngine.constructPlot("farmer_02", "EARTHEN_RAISED_BED", 100000);

        AncientRunicFarmingAgricultureHarvestingEngine.plantSeeds(plot, "SUNFIRE_WHEAT");
        const failRes = AncientRunicFarmingAgricultureHarvestingEngine.plantSeeds(plot, "MOONLIT_NIGHTSHADE");

        expect(failRes.success).toBe(false);
        expect(failRes.reason).toContain("already occupied");
    });

    it("rejects harvesting immature crops", () => {
        const plot = AncientRunicFarmingAgricultureHarvestingEngine.constructPlot("farmer_03", "EARTHEN_RAISED_BED", 100000);

        AncientRunicFarmingAgricultureHarvestingEngine.plantSeeds(plot, "SUNFIRE_WHEAT");
        const failHarvest = AncientRunicFarmingAgricultureHarvestingEngine.harvestCrop(plot);

        expect(failHarvest.success).toBe(false);
        expect(failHarvest.reason).toContain("not mature yet");
    });

    it("irrigates dry plot and restores moisture", () => {
        const plot = AncientRunicFarmingAgricultureHarvestingEngine.constructPlot("farmer_04", "EARTHEN_RAISED_BED", 100000);
        plot.currentWater = 0;
        plot.isFunctional = false;

        const rep = AncientRunicFarmingAgricultureHarvestingEngine.irrigatePlot(plot, 50);
        expect(rep.success).toBe(true);
        expect(rep.newWaterLevel).toBe(50);
        expect(rep.isFunctional).toBe(true);
    });

    it("guards against null inputs and unsupported plot models", () => {
        expect(() => AncientRunicFarmingAgricultureHarvestingEngine.constructPlot("f", "CLAY_POT" as any)).toThrow(
            "Unsupported farming plot type"
        );

        expect(AncientRunicFarmingAgricultureHarvestingEngine.plantSeeds(null as any, "SUNFIRE_WHEAT").success).toBe(false);
        expect(AncientRunicFarmingAgricultureHarvestingEngine.harvestCrop(null as any).success).toBe(false);
        expect(AncientRunicFarmingAgricultureHarvestingEngine.irrigatePlot(null as any).success).toBe(false);
    });
});
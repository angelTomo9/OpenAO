import { describe, it, expect } from "vitest";
import {
    AncientRunicMasonryStonecarvingEngine,
    ActiveMasonryChisel,
} from "../lib/ancientRunicMasonryStonecarving.js";

describe("AncientRunicMasonryStonecarvingEngine Stonecarving & Monuments", () => {
    it("carves Celestial Astral Gateway on Void Carver achieving 100% precision and returns spliced blocks", () => {
        const chisel = AncientRunicMasonryStonecarvingEngine.forgeChisel("mason_01", "CELESTIAL_VOID_CARVER", 100000);
        expect(chisel.chiselType).toBe("CELESTIAL_VOID_CARVER");
        expect(chisel.currentDurability).toBe(310);

        const initialBlocks = [
            "CELESTIAL_STARSTONE_BRICK",
            "CELESTIAL_STARSTONE_BRICK",
            "CELESTIAL_STARSTONE_BRICK"
        ] as any[];

        const carveRes = AncientRunicMasonryStonecarvingEngine.carveMonument(
            chisel,
            "CELESTIAL_ASTRAL_GATEWAY",
            initialBlocks,
            0.1, // Success roll
            1.0, // Precision roll 1.0 -> 40 + 40 + 20 = 100%
            100000
        );

        expect(carveRes.success).toBe(true);
        expect(carveRes.monument?.recipeType).toBe("CELESTIAL_ASTRAL_GATEWAY");
        expect(carveRes.monument?.carvingPrecisionPercent).toBe(100);
        expect(carveRes.monument?.finalStructuralDurability).toBe(8400); // 7000 * 1.20 = 8400
        expect(carveRes.monument?.finalCastleDefenseBonus).toBe(144); // 120 * 1.20 = 144
        expect(carveRes.monument?.consumedBlockCount).toBe(2);
        expect(carveRes.monument?.consumedBlockType).toBe("CELESTIAL_STARSTONE_BRICK");
        expect(carveRes.monument?.remainingProvidedBlocks.length).toBe(1);
        expect(carveRes.remainingDurability).toBe(300); // 310 - 10
    });

    it("rejects carving when insufficient blocks are provided", () => {
        const chisel = AncientRunicMasonryStonecarvingEngine.forgeChisel("mason_02", "HARDENED_BRONZE_CHISEL", 100000);

        const failRes = AncientRunicMasonryStonecarvingEngine.carveMonument(
            chisel,
            "FORTRESS_CITADEL_BASTION",
            ["OBSIDIAN_MONOLITH"]
        );

        expect(failRes.success).toBe(false);
        expect(failRes.reason).toContain("Insufficient blocks");
        expect(chisel.currentDurability).toBe(75);
    });

    it("handles stone fracture failure roll consuming durability", () => {
        const chisel = AncientRunicMasonryStonecarvingEngine.forgeChisel("mason_03", "HARDENED_BRONZE_CHISEL", 100000); // 85% success

        const fracture = AncientRunicMasonryStonecarvingEngine.carveMonument(
            chisel,
            "RUNIC_OBELISK_OF_POWER",
            ["GRANITE_SLAB", "GRANITE_SLAB"],
            0.95
        );

        expect(fracture.success).toBe(false);
        expect(fracture.reason).toContain("Carving fractured");
        expect(chisel.currentDurability).toBe(65); // 75 - 10
    });

    it("sharpens chisel and restores functionality", () => {
        const chisel = AncientRunicMasonryStonecarvingEngine.forgeChisel("mason_04", "HARDENED_BRONZE_CHISEL", 100000);
        chisel.currentDurability = 0;
        chisel.isFunctional = false;

        const rep = AncientRunicMasonryStonecarvingEngine.sharpenChisel(chisel, 50);
        expect(rep.success).toBe(true);
        expect(rep.newDurability).toBe(50);
        expect(rep.isFunctional).toBe(true);
    });

    it("guards against null inputs and unsupported chisel models", () => {
        expect(() => AncientRunicMasonryStonecarvingEngine.forgeChisel("m", "JACKHAMMER" as any)).toThrow(
            "Unsupported masonry chisel type"
        );

        expect(AncientRunicMasonryStonecarvingEngine.carveMonument(null as any, "RUNIC_OBELISK_OF_POWER", []).success).toBe(false);
        expect(AncientRunicMasonryStonecarvingEngine.sharpenChisel(null as any).success).toBe(false);
    });
});
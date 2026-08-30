import { describe, it, expect } from "vitest";
import {
    AncientRunicArtifactArcheologyDigEngine,
    ActiveArcheologyTool,
    ActiveDigSite,
} from "../lib/ancientRunicArtifactArcheologyDig.js";

describe("AncientRunicArtifactArcheologyDigEngine Archeology & Relic Restoration", () => {
    it("excavates Astral Necropolis with Runic Sonic Sifter yielding Star Core Phylactery with high purity", () => {
        const tool = AncientRunicArtifactArcheologyDigEngine.forgeSurveyTool("arch_01", "RUNIC_SONIC_SIFTER", 100000);
        expect(tool.toolType).toBe("RUNIC_SONIC_SIFTER");
        expect(tool.currentDurability).toBe(220);

        const site: ActiveDigSite = {
            siteId: "site_necropolis_01",
            siteType: "ASTRAL_NECROPOLIS_DIG",
            location: { x: 300, y: 400 },
            remainingExcavationLayers: 5,
            isFullyExcavated: false,
        };

        const digRes = AncientRunicArtifactArcheologyDigEngine.excavateSiteLayer(tool, site, 0.5, 100000);
        expect(digRes.success).toBe(true);
        expect(digRes.relic?.relicType).toBe("STAR_CORE_PHYLACTERY");
        expect(digRes.relic?.purityRatingPercent).toBe(100);
        expect(digRes.relic?.museumGoldReward).toBe(1000); // 500 * (0.5 + 1.0 + 0.5 rare) = 1000
        expect(digRes.remainingDurability).toBe(210);
        expect(digRes.remainingLayers).toBe(4);
    });

    it("excavates Sunken Catacombs with Bronze Trowel finding Golden Scarab", () => {
        const trowel = AncientRunicArtifactArcheologyDigEngine.forgeSurveyTool("arch_02", "BRONZE_EXCAVATION_TROWEL", 100000);
        const site: ActiveDigSite = {
            siteId: "site_catacombs_01",
            siteType: "SUNKEN_CATACOMBS_DIG",
            location: { x: 50, y: 50 },
            remainingExcavationLayers: 3,
            isFullyExcavated: false,
        };

        const res = AncientRunicArtifactArcheologyDigEngine.excavateSiteLayer(trowel, site, 0.5, 100000);
        expect(res.success).toBe(true);
        expect(res.relic?.relicType).toBe("GOLDEN_SCARAB_AMULET");
        expect(res.relic?.purityRatingPercent).toBe(50); // 30 + 20
        expect(res.relic?.museumGoldReward).toBe(250); // 200 * (0.5 + 0.5 + 0.25) = 250
    });

    it("restores tool durability and rejects restoring broken tool", () => {
        const brush = AncientRunicArtifactArcheologyDigEngine.forgeSurveyTool("arch_03", "BRISTLE_SURVEY_BRUSH", 100000);
        brush.currentDurability = 40;

        const rep = AncientRunicArtifactArcheologyDigEngine.restoreToolDurability(brush, 30);
        expect(rep.success).toBe(true);
        expect(rep.newDurability).toBe(70);

        // Break tool
        brush.currentDurability = 0;
        brush.isBroken = true;

        const failRep = AncientRunicArtifactArcheologyDigEngine.restoreToolDurability(brush, 50);
        expect(failRep.success).toBe(false);
        expect(failRep.isBroken).toBe(true);
    });

    it("depletes dig site layers and rejects excavation on fully excavated sites", () => {
        const trowel = AncientRunicArtifactArcheologyDigEngine.forgeSurveyTool("arch_04", "BRONZE_EXCAVATION_TROWEL", 100000);
        const site: ActiveDigSite = {
            siteId: "site_ruins_01",
            siteType: "SANDSTONE_RUINS_DIG",
            location: { x: 10, y: 10 },
            remainingExcavationLayers: 1,
            isFullyExcavated: false,
        };

        const lastDig = AncientRunicArtifactArcheologyDigEngine.excavateSiteLayer(trowel, site, 0.2);
        expect(lastDig.success).toBe(true);
        expect(lastDig.remainingLayers).toBe(0);
        expect(site.isFullyExcavated).toBe(true);

        const failDig = AncientRunicArtifactArcheologyDigEngine.excavateSiteLayer(trowel, site);
        expect(failDig.success).toBe(false);
        expect(failDig.reason).toContain("fully excavated");
    });

    it("guards against null inputs and unsupported tool models", () => {
        expect(() => AncientRunicArtifactArcheologyDigEngine.forgeSurveyTool("a", "WOODEN_STICK" as any)).toThrow(
            "Unsupported archeology tool type"
        );

        expect(AncientRunicArtifactArcheologyDigEngine.excavateSiteLayer(null as any, null as any).success).toBe(false);
        expect(AncientRunicArtifactArcheologyDigEngine.restoreToolDurability(null as any).success).toBe(false);
    });
});
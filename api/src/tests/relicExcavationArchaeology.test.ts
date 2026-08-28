import { describe, it, expect } from "vitest";
import {
    RelicExcavationArchaeologyEngine,
    ArchaeologyDigSite,
} from "../lib/relicExcavationArchaeology.js";

describe("RelicExcavationArchaeologyEngine Surveying, Brush Excavation & Artifact Assembly", () => {
    it("triangulates survey cues accurately based on distance to target", () => {
        const site: ArchaeologyDigSite = {
            siteId: "site_tomb_01",
            theme: "DESERT_TOMB",
            targetRelicLocation: { x: 100, y: 100 },
            totalFragmentsRemaining: 4,
            isFullyExcavated: false,
        };

        // Player at (100, 100) -> Exact node
        const exact = RelicExcavationArchaeologyEngine.surveyTriangulation(site, 100, 100);
        expect(exact.cue).toBe("EXCAVATION_NODE_FOUND");
        expect(exact.distanceTiles).toBe(0);

        // Player at (110, 100) -> 10 tiles away -> HOT
        const hot = RelicExcavationArchaeologyEngine.surveyTriangulation(site, 110, 100);
        expect(hot.cue).toBe("HOT");

        // Player at (140, 100) -> 40 tiles away -> WARM
        const warm = RelicExcavationArchaeologyEngine.surveyTriangulation(site, 140, 100);
        expect(warm.cue).toBe("WARM");

        // Player at (200, 200) -> >100 tiles away -> COLD
        const cold = RelicExcavationArchaeologyEngine.surveyTriangulation(site, 200, 200);
        expect(cold.cue).toBe("COLD");
    });

    it("successfully unearths fragment using DELICATE brush technique", () => {
        const site: ArchaeologyDigSite = {
            siteId: "site_glacier_01",
            theme: "FROZEN_GLACIER",
            targetRelicLocation: { x: 50, y: 50 },
            totalFragmentsRemaining: 3,
            isFullyExcavated: false,
        };

        const session = RelicExcavationArchaeologyEngine.startExcavationSession(site, 70).session!;

        for (let i = 0; i < 10; i++) {
            RelicExcavationArchaeologyEngine.applyBrushStroke(session, "DELICATE");
        }

        expect(session.isSuccessfullyUnearthed).toBe(true);
        expect(session.isShattered).toBe(false);
        expect(session.currentPressureAccumulated).toBe(50); // 10 * 5 = 50 <= 70 threshold
    });

    it("shatters relic when AGGRESSIVE brush exceeds fragility threshold", () => {
        const site: ArchaeologyDigSite = {
            siteId: "site_volcano_01",
            theme: "VOLCANIC_RUINS",
            targetRelicLocation: { x: 20, y: 20 },
            totalFragmentsRemaining: 2,
            isFullyExcavated: false,
        };

        const session = RelicExcavationArchaeologyEngine.startExcavationSession(site, 50).session!;

        // 2 aggressive strokes: 2 * 30 = 60 pressure (> 50 threshold) -> Shatters
        RelicExcavationArchaeologyEngine.applyBrushStroke(session, "AGGRESSIVE");
        const res = RelicExcavationArchaeologyEngine.applyBrushStroke(session, "AGGRESSIVE");

        expect(res.isShattered).toBe(true);
        expect(session.isShattered).toBe(true);
        expect(res.reason).toContain("shattered into dust");
    });

    it("restores ancient relic artifact and awards museum exhibition points", () => {
        const restoreRes = RelicExcavationArchaeologyEngine.restoreArtifact(
            "SUNKEN_ATLANTIS",
            4,
            "Crown of the Abyssal Kings"
        );

        expect(restoreRes.success).toBe(true);
        expect(restoreRes.artifact?.artifactName).toBe("Crown of the Abyssal Kings");
        expect(restoreRes.artifact?.museumExhibitionPoints).toBe(600); // 4 * 150
    });

    it("rejects artifact restoration with insufficient fragments", () => {
        const failRes = RelicExcavationArchaeologyEngine.restoreArtifact("DESERT_TOMB", 2, "Incomplete Urn");
        expect(failRes.success).toBe(false);
        expect(failRes.reason).toContain("requires at least 4 fragments");
    });
});
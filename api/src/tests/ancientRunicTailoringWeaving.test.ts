import { describe, it, expect } from "vitest";
import {
    AncientRunicTailoringWeavingEngine,
    ActiveTailoringLoom,
} from "../lib/ancientRunicTailoringWeaving.js";

describe("AncientRunicTailoringWeavingEngine Cloth Weaving & Robe Imbuing", () => {
    it("weaves Stardust Astral Robe on Astral Weaver Loom achieving 100% quality and tracks consumed fibers", () => {
        const loom = AncientRunicTailoringWeavingEngine.constructLoom("tailor_01", "ASTRAL_WEAVER_LOOM", 100000);
        expect(loom.loomType).toBe("ASTRAL_WEAVER_LOOM");
        expect(loom.currentDurability).toBe(300);

        const weaveRes = AncientRunicTailoringWeavingEngine.weaveRobe(
            loom,
            "STARDUST_ASTRAL_ROBE",
            ["CELESTIAL_STARDUST_THREAD", "CELESTIAL_STARDUST_THREAD"],
            0.5,
            100000
        );

        expect(weaveRes.success).toBe(true);
        expect(weaveRes.tailoredRobe?.recipeType).toBe("STARDUST_ASTRAL_ROBE");
        expect(weaveRes.tailoredRobe?.weavingQualityPercent).toBe(100); // 50 + 15 + 35 = 100
        expect(weaveRes.tailoredRobe?.finalArmorRating).toBe(108); // 90 * 1.20 = 108
        expect(weaveRes.tailoredRobe?.finalMaxManaBonus).toBe(180); // 150 * 1.20 = 180
        expect(weaveRes.tailoredRobe?.consumedFiberCount).toBe(2);
        expect(weaveRes.tailoredRobe?.consumedFiberType).toBe("CELESTIAL_STARDUST_THREAD");
        expect(weaveRes.remainingDurability).toBe(290); // 300 - 10
    });

    it("rejects weaving when insufficient fibers are provided", () => {
        const loom = AncientRunicTailoringWeavingEngine.constructLoom("tailor_02", "WOODEN_DROP_SPINDLE", 100000);

        // Void Raiment requires 2x VOID_SPIDER_WEB. Only provided 1
        const failRes = AncientRunicTailoringWeavingEngine.weaveRobe(
            loom,
            "VOID_SHADOW_RAIMENT",
            ["VOID_SPIDER_WEB"]
        );

        expect(failRes.success).toBe(false);
        expect(failRes.reason).toContain("Insufficient fibers");
        expect(loom.currentDurability).toBe(70);
    });

    it("handles snapped thread failure roll consuming durability", () => {
        const loom = AncientRunicTailoringWeavingEngine.constructLoom("tailor_03", "WOODEN_DROP_SPINDLE", 100000); // 85% success

        // Roll 0.95 (95 > 85%) -> Snapped
        const snap = AncientRunicTailoringWeavingEngine.weaveRobe(
            loom,
            "ARCANIST_APPRENTICE_VESTMENT",
            ["SILK_MOTH_COCOON", "SILK_MOTH_COCOON"],
            0.95
        );

        expect(snap.success).toBe(false);
        expect(snap.reason).toContain("threads snapped");
        expect(loom.currentDurability).toBe(60); // 70 - 10
    });

    it("maintains loom tension and restores weaving durability", () => {
        const loom = AncientRunicTailoringWeavingEngine.constructLoom("tailor_04", "WOODEN_DROP_SPINDLE", 100000);
        loom.currentDurability = 0;
        loom.isThreaded = false;

        const rep = AncientRunicTailoringWeavingEngine.maintainLoom(loom, 50);
        expect(rep.success).toBe(true);
        expect(rep.newDurability).toBe(50);
        expect(rep.isThreaded).toBe(true);
    });

    it("guards against null inputs and unsupported loom models", () => {
        expect(() => AncientRunicTailoringWeavingEngine.constructLoom("t", "SEWING_MACHINE" as any)).toThrow(
            "Unsupported tailoring loom type"
        );

        expect(AncientRunicTailoringWeavingEngine.weaveRobe(null as any, "ARCANIST_APPRENTICE_VESTMENT", []).success).toBe(false);
        expect(AncientRunicTailoringWeavingEngine.maintainLoom(null as any).success).toBe(false);
    });
});
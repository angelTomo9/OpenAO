import { describe, it, expect } from "vitest";
import {
    AncientRunicChronoStasisEngine,
    ActiveTimeDilationField,
    ChronoCombatEntity,
} from "../lib/ancientRunicChronoStasis.js";

describe("AncientRunicChronoStasisEngine Time-Dilation & Stasis", () => {
    it("deploys Singularity Temporal Core and applies Temporal Haste to allies and Chrono Stasis to enemies in radius", () => {
        const field = AncientRunicChronoStasisEngine.deployTemporalField("mage_01", "SINGULARITY_TEMPORAL_CORE", 50, 50, 100000);
        expect(field.fieldRadiusTiles).toBe(16);
        expect(field.remainingLifespanSeconds).toBe(60);

        const ally: ChronoCombatEntity = { entityId: "ally_01", isFriendlyToCaster: true, location: { x: 55, y: 50 }, isAlive: true, activeChronoEffects: [] }; // 5 tiles away
        const enemyNear: ChronoCombatEntity = { entityId: "enemy_01", isFriendlyToCaster: false, location: { x: 60, y: 50 }, isAlive: true, activeChronoEffects: [] }; // 10 tiles away
        const enemyFar: ChronoCombatEntity = { entityId: "enemy_far", isFriendlyToCaster: false, location: { x: 90, y: 50 }, isAlive: true, activeChronoEffects: [] }; // 40 tiles away

        const pulseRes = AncientRunicChronoStasisEngine.pulseTemporalField(field, [ally, enemyNear, enemyFar]);
        expect(pulseRes.success).toBe(true);
        expect(pulseRes.affectedCount).toBe(2);
        expect(pulseRes.hasteAppliedCount).toBe(1);
        expect(pulseRes.stasisAppliedCount).toBe(1);

        expect(ally.activeChronoEffects).toContain("TEMPORAL_HASTE_50");
        expect(enemyNear.activeChronoEffects).toContain("CHRONO_STASIS_LOCK");
        expect(enemyFar.activeChronoEffects).toEqual([]);
    });

    it("clears temporal effects when entity moves outside field radius on subsequent pulse", () => {
        const field = AncientRunicChronoStasisEngine.deployTemporalField("m", "CHRONO_HOURGLASS", 0, 0, 100000);
        const entity: ChronoCombatEntity = { entityId: "e", isFriendlyToCaster: true, location: { x: 2, y: 2 }, isAlive: true, activeChronoEffects: [] };

        AncientRunicChronoStasisEngine.pulseTemporalField(field, [entity]);
        expect(entity.activeChronoEffects).toContain("TEMPORAL_HASTE_50");

        // Entity moves outside radius (30, 30)
        entity.location = { x: 30, y: 30 };
        AncientRunicChronoStasisEngine.pulseTemporalField(field, [entity]);
        expect(entity.activeChronoEffects).toEqual([]);
    });

    it("ticks field lifespan and collapses field when time expires", () => {
        const field = AncientRunicChronoStasisEngine.deployTemporalField("m", "CHRONO_HOURGLASS", 0, 0, 100000); // 30s lifespan

        const tick1 = AncientRunicChronoStasisEngine.tickFieldLifespan(field, 10);
        expect(tick1.remainingSeconds).toBe(20);
        expect(tick1.isCollapsed).toBe(false);

        const tick2 = AncientRunicChronoStasisEngine.tickFieldLifespan(field, 20);
        expect(tick2.remainingSeconds).toBe(0);
        expect(tick2.isCollapsed).toBe(true);
        expect(field.isActive).toBe(false);

        // Subsequent pulse rejected on collapsed field
        const ally: ChronoCombatEntity = { entityId: "a", isFriendlyToCaster: true, location: { x: 1, y: 1 }, isAlive: true, activeChronoEffects: [] };
        const failPulse = AncientRunicChronoStasisEngine.pulseTemporalField(field, [ally]);
        expect(failPulse.success).toBe(false);
        expect(failPulse.reason).toContain("collapsed");
    });

    it("guards against dead entities and unsupported device models", () => {
        expect(() => AncientRunicChronoStasisEngine.deployTemporalField("m", "QUANTUM_TOASTER" as any)).toThrow(
            "Unsupported chrono device"
        );

        const field = AncientRunicChronoStasisEngine.deployTemporalField("m", "CHRONO_HOURGLASS", 0, 0);
        const deadAlly: ChronoCombatEntity = { entityId: "dead", isFriendlyToCaster: true, location: { x: 1, y: 1 }, isAlive: false, activeChronoEffects: [] };

        const pulse = AncientRunicChronoStasisEngine.pulseTemporalField(field, [deadAlly]);
        expect(pulse.affectedCount).toBe(0);
    });

    it("guards against null/undefined fields and invalid inputs", () => {
        expect(AncientRunicChronoStasisEngine.pulseTemporalField(null as any, []).success).toBe(false);
        expect(AncientRunicChronoStasisEngine.tickFieldLifespan(null as any).success).toBe(false);
    });
});
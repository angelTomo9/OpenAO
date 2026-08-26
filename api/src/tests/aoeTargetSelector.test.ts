import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AoETargetSelector, TargetEntity, AoEShapeDefinition } from "../lib/aoeTargetSelector.js";

describe("AoETargetSelector Spatial Boundaries", () => {
    const origin = { x: 10, y: 10 };
    const entities: TargetEntity[] = [
        { id: "caster", x: 10, y: 10, teamId: 1, isAlive: true },
        { id: "enemy_near", x: 12, y: 10, teamId: 2, isAlive: true }, // Dist 2
        { id: "enemy_far", x: 20, y: 10, teamId: 2, isAlive: true }, // Dist 10
        { id: "friendly", x: 10, y: 12, teamId: 1, isAlive: true }, // Dist 2
        { id: "dead_enemy", x: 11, y: 10, teamId: 2, isAlive: false },
    ];

    it("selects circular AoE hostile targets filtering dead and friendly entities", () => {
        const circleShape: AoEShapeDefinition = { shape: "CIRCLE", origin, radius: 5.0 };
        const selected = AoETargetSelector.selectTargets(entities, {
            shape: circleShape,
            casterId: "caster",
            casterTeamId: 1,
            filter: "HOSTILE_ONLY",
        });

        assert.equal(selected.length, 1);
        assert.equal(selected[0].id, "enemy_near");
    });

    it("evaluates ring/donut AoE excluding co-located enemies", () => {
        const ringShape: AoEShapeDefinition = {
            shape: "RING_DONUT",
            origin,
            radius: 12.0,
            innerRadius: 5.0,
        };
        const selected = AoETargetSelector.selectTargets(entities, {
            shape: ringShape,
            casterId: "caster",
            casterTeamId: 1,
            filter: "HOSTILE_ONLY",
        });

        // Only enemy_far (dist 10) is within [5, 12]
        assert.equal(selected.length, 1);
        assert.equal(selected[0].id, "enemy_far");
    });

    it("blocks targets behind solid collision walls using line-of-sight raycasting", () => {
        const circleShape: AoEShapeDefinition = { shape: "CIRCLE", origin, radius: 5.0 };

        // Place a wall at (11, 10) between caster (10,10) and enemy_near (12,10)
        const wallGrid: boolean[][] = Array.from({ length: 25 }, () => Array(25).fill(false));
        wallGrid[10][11] = true;

        const selected = AoETargetSelector.selectTargets(entities, {
            shape: circleShape,
            casterId: "caster",
            casterTeamId: 1,
            filter: "HOSTILE_ONLY",
            wallCollisionMap: wallGrid,
        });

        // Blocked by wall!
        assert.equal(selected.length, 0);
    });
});
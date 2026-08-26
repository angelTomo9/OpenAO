import { describe, it, expect } from "vitest";
import { AoETargetSelector, TargetEntity } from "../lib/aoeTargetSelector.js";

describe("AoETargetSelector Geometry and Line of Sight", () => {
    const mockEntities: TargetEntity[] = [
        { entityId: "m1", x: 0, y: 3, isAlive: true },   // In front (North)
        { entityId: "m2", x: 3, y: 0, isAlive: true },   // Right (East)
        { entityId: "m3", x: 0, y: -3, isAlive: true },  // Behind (South)
        { entityId: "m4", x: 0, y: 15, isAlive: true },  // Far North
        { entityId: "dead_1", x: 0, y: 2, isAlive: false }, // Dead
    ];

    it("selects entities inside circular radius and ignores dead entities", () => {
        const targets = AoETargetSelector.selectTargets(mockEntities, {
            shapeType: "CIRCLE",
            origin: { x: 0, y: 0 },
            radius: 5,
        });

        expect(targets.length).toBe(3); // m1, m2, m3
        expect(targets.some(t => t.entityId === "dead_1")).toBe(false);
    });

    it("selects entities inside directional cone facing North", () => {
        // Facing angle PI/2 = North (dx=0, dy>0)
        const targets = AoETargetSelector.selectTargets(mockEntities, {
            shapeType: "CONE_SECTOR",
            origin: { x: 0, y: 0 },
            radius: 6,
            facingAngleRad: Math.PI / 2, // North
            coneSpreadAngleRad: Math.PI / 2, // 90 degrees
        });

        expect(targets.length).toBe(1);
        expect(targets[0].entityId).toBe("m1");
    });

    it("blocks targets behind solid obstruction walls", () => {
        const blockedTiles = new Set(["0,2"]); // Wall between (0,0) and (0,3)
        const targets = AoETargetSelector.selectTargets(
            mockEntities,
            { shapeType: "CIRCLE", origin: { x: 0, y: 0 }, radius: 5 },
            blockedTiles
        );

        // m1 at (0,3) is blocked by wall at (0,2); m2 and m3 are clear
        expect(targets.length).toBe(2);
        expect(targets.some(t => t.entityId === "m1")).toBe(false);
    });
});
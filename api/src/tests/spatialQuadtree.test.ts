import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Quadtree, AABB, SpatialEntity } from "../lib/spatialQuadtree.js";

describe("Spatial Quadtree Map Optimization", () => {
    it("inserts entities into the correct bounded region", () => {
        // Create a 100x100 map centered at (50, 50)
        const boundary = new AABB(50, 50, 50, 50);
        const qt = new Quadtree(boundary);

        const e1: SpatialEntity = { entityId: "mob_1", x: 25, y: 25 };
        const e2: SpatialEntity = { entityId: "mob_2", x: -10, y: 25 }; // Out of bounds

        assert.equal(qt.insert(e1), true);
        assert.equal(qt.insert(e2), false); // Rejected correctly
    });

    it("subdivides dynamically when capacity is exceeded", () => {
        const boundary = new AABB(50, 50, 50, 50);
        const qt = new Quadtree(boundary);

        // Insert 5 entities (exceeds CAPACITY of 4)
        qt.insert({ entityId: "1", x: 10, y: 10 });
        qt.insert({ entityId: "2", x: 20, y: 20 });
        qt.insert({ entityId: "3", x: 30, y: 30 });
        qt.insert({ entityId: "4", x: 40, y: 40 });
        qt.insert({ entityId: "5", x: 90, y: 90 }); // Should trigger subdivision

        // We can't access private members directly in tests, but we can verify via query
        const queryBox = new AABB(90, 90, 5, 5); // Search a tiny box around entity 5
        const results = qt.queryRange(queryBox);
        assert.equal(results.length, 1);
        assert.equal(results[0].entityId, "5");
    });

    it("efficiently queries ranges for AoE spells without checking entire map", () => {
        const boundary = new AABB(500, 500, 500, 500); // 1000x1000 map
        const qt = new Quadtree(boundary);

        // Clump of 3 entities at top right
        qt.insert({ entityId: "tr_1", x: 800, y: 800 });
        qt.insert({ entityId: "tr_2", x: 810, y: 805 });
        qt.insert({ entityId: "tr_3", x: 790, y: 795 });

        // Entities scattered elsewhere
        qt.insert({ entityId: "bl_1", x: 100, y: 100 });
        qt.insert({ entityId: "br_1", x: 900, y: 100 });
        qt.insert({ entityId: "tl_1", x: 100, y: 900 });

        // AoE spell (Meteor) strikes top right, bounding box 50x50 around (800, 800)
        const aoeHitbox = new AABB(800, 800, 25, 25);
        
        const victims = qt.queryRange(aoeHitbox);
        
        assert.equal(victims.length, 3);
        assert.ok(victims.some(v => v.entityId === "tr_1"));
        assert.ok(victims.some(v => v.entityId === "tr_2"));
        assert.ok(victims.some(v => v.entityId === "tr_3"));
        assert.ok(!victims.some(v => v.entityId === "bl_1")); // Bottom left is safely ignored
    });
});
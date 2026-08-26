import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { SpatialAudioEngine, Position2D } from "../lib/spatialAudio.js";

describe("SpatialAudioEngine 2D Sound Attenuation", () => {
    const listener: Position2D = { x: 10, y: 10 };

    it("returns maximum gain for co-located sound source", () => {
        const res = SpatialAudioEngine.computeSpatialGain(listener, listener);
        assert.equal(res.distance, 0);
        assert.equal(res.volume, 1.0);
        assert.equal(res.audible, true);
    });

    it("attenuates volume with distance according to inverse model", () => {
        const sourceNearby: Position2D = { x: 10, y: 12 }; // dist 2
        const sourceFar: Position2D = { x: 10, y: 20 }; // dist 10

        const resNear = SpatialAudioEngine.computeSpatialGain(sourceNearby, listener, undefined, undefined, { refDistance: 1, maxDistance: 25 });
        const resFar = SpatialAudioEngine.computeSpatialGain(sourceFar, listener, undefined, undefined, { refDistance: 1, maxDistance: 25 });

        assert.ok(resNear.volume > resFar.volume);
        assert.ok(resFar.volume > 0);
    });

    it("mutes sounds beyond maxDistance limit", () => {
        const sourceOutOfRange: Position2D = { x: 50, y: 50 };
        const res = SpatialAudioEngine.computeSpatialGain(sourceOutOfRange, listener, undefined, undefined, { maxDistance: 25 });

        assert.equal(res.volume, 0);
        assert.equal(res.audible, false);
    });

    it("calculates stereo channel balance based on horizontal displacement", () => {
        const sourceRight: Position2D = { x: 15, y: 10 };
        const sourceLeft: Position2D = { x: 5, y: 10 };

        const resRight = SpatialAudioEngine.computeSpatialGain(sourceRight, listener);
        const resLeft = SpatialAudioEngine.computeSpatialGain(sourceLeft, listener);

        assert.ok(resRight.rightGain > resRight.leftGain);
        assert.ok(resLeft.leftGain > resLeft.rightGain);
    });

    it("applies directional cone attenuation", () => {
        const sourcePos: Position2D = { x: 10, y: 5 };
        const sourceFacingNorth = { dirX: 0, dirY: -1 }; // Facing away from listener at (10, 10)

        const res = SpatialAudioEngine.computeSpatialGain(
            sourcePos,
            listener,
            undefined,
            sourceFacingNorth,
            { coneInnerAngle: 60, coneOuterAngle: 120, coneOuterGain: 0.1 }
        );

        assert.ok(res.volume <= 0.2); // Attenuated because listener is behind the source cone
    });
});
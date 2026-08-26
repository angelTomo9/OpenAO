import { describe, it, expect } from "vitest";
import { SpatialAudioEngine } from "../lib/spatialAudio.js";

describe("SpatialAudioEngine 2D Acoustics and Attenuation", () => {
    it("renders full volume at min distance and zero volume past max distance", () => {
        const listener = { x: 0, y: 0 };
        const closeEmitter = { x: 0, y: 1, maxDistance: 20, minDistance: 1 };
        const farEmitter = { x: 0, y: 25, maxDistance: 20, minDistance: 1 };

        const closeResult = SpatialAudioEngine.renderAudio(listener, closeEmitter);
        expect(closeResult.effectiveVolume).toBe(1.0);
        expect(closeResult.isAudible).toBe(true);

        const farResult = SpatialAudioEngine.renderAudio(listener, farEmitter);
        expect(farResult.effectiveVolume).toBe(0.0);
        expect(farResult.isAudible).toBe(false);
    });

    it("applies constant-power stereo pan according to emitter horizontal position", () => {
        const listener = { x: 0, y: 0 };
        const leftEmitter = { x: -10, y: 0, maxDistance: 30 };
        const rightEmitter = { x: 10, y: 0, maxDistance: 30 };

        const leftAudio = SpatialAudioEngine.renderAudio(listener, leftEmitter);
        expect(leftAudio.panLeft).toBeGreaterThan(leftAudio.panRight);

        const rightAudio = SpatialAudioEngine.renderAudio(listener, rightEmitter);
        expect(rightAudio.panRight).toBeGreaterThan(rightAudio.panLeft);
    });

    it("applies -50% occlusion attenuation when sound is blocked by dungeon walls", () => {
        const listener = { x: 0, y: 0 };
        const clearEmitter = { x: 5, y: 0, maxDistance: 20, isOccludedByWall: false };
        const blockedEmitter = { x: 5, y: 0, maxDistance: 20, isOccludedByWall: true };

        const clearRes = SpatialAudioEngine.renderAudio(listener, clearEmitter);
        const blockedRes = SpatialAudioEngine.renderAudio(listener, blockedEmitter);

        expect(blockedRes.effectiveVolume).toBeCloseTo(clearRes.effectiveVolume * 0.50, 2);
    });
});
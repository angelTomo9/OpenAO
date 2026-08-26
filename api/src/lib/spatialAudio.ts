/**
 * 2D Spatial Audio Attenuation & Stereo Panning Engine for OpenAO MMORPG.
 * Computes realistic distance falloff, directional cones, obstacle occlusion,
 * and equal-power stereo channel gain distribution.
 */

export type DistanceModel = "inverse" | "linear" | "exponential";

export interface Position2D {
    x: number;
    y: number;
}

export interface Orientation2D {
    dirX: number;
    dirY: number;
}

export interface SpatialAudioOptions {
    refDistance?: number;
    maxDistance?: number;
    rolloffFactor?: number;
    distanceModel?: DistanceModel;
    coneInnerAngle?: number; // degrees
    coneOuterAngle?: number; // degrees
    coneOuterGain?: number;
    occlusionFactor?: number; // 0 (no occlusion) to 1 (full occlusion)
}

export interface SpatialGainResult {
    volume: number;
    leftGain: number;
    rightGain: number;
    distance: number;
    panning: number; // -1 (full left) to +1 (full right)
    audible: boolean;
}

export class SpatialAudioEngine {
    /**
     * Calculates Euclidean distance between source and listener.
     */
    static getDistance(p1: Position2D, p2: Position2D): number {
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * Computes distance attenuation gain according to the specified physical model.
     */
    static calculateDistanceGain(
        distance: number,
        refDist: number,
        maxDist: number,
        rolloff: number,
        model: DistanceModel
    ): number {
        const clampedDist = Math.max(distance, refDist);

        if (distance >= maxDist) {
            return 0;
        }

        switch (model) {
            case "linear": {
                const norm = (clampedDist - refDist) / (maxDist - refDist);
                return Math.max(0, 1 - rolloff * norm);
            }
            case "exponential": {
                if (refDist <= 0 || clampedDist <= 0) return 0;
                return Math.pow(clampedDist / refDist, -rolloff);
            }
            case "inverse":
            default: {
                return refDist / (refDist + rolloff * (clampedDist - refDist));
            }
        }
    }

    /**
     * Computes directional cone attenuation multiplier.
     */
    static calculateConeGain(
        sourcePos: Position2D,
        sourceOrientation: Orientation2D,
        listenerPos: Position2D,
        innerAngle: number,
        outerAngle: number,
        outerGain: number
    ): number {
        const dx = listenerPos.x - sourcePos.x;
        const dy = listenerPos.y - sourcePos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist === 0) return 1.0;

        // Normalize source orientation
        const len = Math.sqrt(
            sourceOrientation.dirX * sourceOrientation.dirX +
            sourceOrientation.dirY * sourceOrientation.dirY
        );
        if (len === 0) return 1.0;

        const normDirX = sourceOrientation.dirX / len;
        const normDirY = sourceOrientation.dirY / len;

        const toListenerX = dx / dist;
        const toListenerY = dy / dist;

        // Dot product gives cosine of angle
        const dot = Math.max(-1, Math.min(1, normDirX * toListenerX + normDirY * toListenerY));
        const angleDeg = (Math.acos(dot) * 180) / Math.PI;

        const halfInner = innerAngle / 2;
        const halfOuter = outerAngle / 2;

        if (angleDeg <= halfInner) {
            return 1.0;
        }
        if (angleDeg >= halfOuter) {
            return outerGain;
        }

        // Linear interpolation between inner and outer cone
        const factor = (angleDeg - halfInner) / (halfOuter - halfInner);
        return 1.0 - factor * (1.0 - outerGain);
    }

    /**
     * Computes full spatial attenuation, stereo channel gains, and audibility status.
     */
    static computeSpatialGain(
        sourcePos: Position2D,
        listenerPos: Position2D,
        listenerOrientation?: Orientation2D,
        sourceOrientation?: Orientation2D,
        options: SpatialAudioOptions = {}
    ): SpatialGainResult {
        const refDist = options.refDistance ?? 1.0;
        const maxDist = options.maxDistance ?? 25.0;
        const rolloff = options.rolloffFactor ?? 1.0;
        const model = options.distanceModel ?? "inverse";
        const occlusion = Math.max(0, Math.min(1, options.occlusionFactor ?? 0));

        const dist = this.getDistance(sourcePos, listenerPos);

        if (dist >= maxDist) {
            return {
                volume: 0,
                leftGain: 0,
                rightGain: 0,
                distance: dist,
                panning: 0,
                audible: false,
            };
        }

        // 1. Distance attenuation
        let gain = this.calculateDistanceGain(dist, refDist, maxDist, rolloff, model);

        // 2. Cone attenuation (if source has orientation)
        if (sourceOrientation && options.coneInnerAngle && options.coneOuterAngle) {
            const coneGain = this.calculateConeGain(
                sourcePos,
                sourceOrientation,
                listenerPos,
                options.coneInnerAngle,
                options.coneOuterAngle,
                options.coneOuterGain ?? 0.2
            );
            gain *= coneGain;
        }

        // 3. Wall/Obstacle occlusion
        gain *= (1.0 - occlusion * 0.75);

        // 4. Equal-power stereo panning
        const dx = sourcePos.x - listenerPos.x;
        const dy = sourcePos.y - listenerPos.y;

        // Panning azimuth relative to listener orientation (default forward is (0, -1) North)
        const lDirX = listenerOrientation?.dirX ?? 0;
        const lDirY = listenerOrientation?.dirY ?? -1;

        // Calculate angle between listener forward vector and source direction
        const relX = dx; // Positive to right
        const maxPanDist = Math.max(refDist, Math.min(dist, 10.0));
        const pan = Math.max(-1.0, Math.min(1.0, relX / maxPanDist));

        // Equal-power law: Left = cos((pan + 1) * pi / 4), Right = sin((pan + 1) * pi / 4)
        const panAngle = ((pan + 1) * Math.PI) / 4;
        const leftGain = gain * Math.cos(panAngle);
        const rightGain = gain * Math.sin(panAngle);

        return {
            volume: gain,
            leftGain,
            rightGain,
            distance: dist,
            panning: pan,
            audible: gain > 0.001,
        };
    }
}
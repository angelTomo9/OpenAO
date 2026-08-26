/**
 * 2D Spatial Audio Engine & Distance Attenuation for OpenAO MMORPG.
 * Simulates logarithmic/linear distance volume falloff, constant-power stereo panning (cos/sin),
 * and dungeon wall obstruction attenuation.
 */

export type FalloffModel = "INVERSE_DISTANCE" | "LINEAR" | "EXPONENTIAL";

export interface AudioListenerPosition {
    x: number;
    y: number;
    facingAngleRad?: number;
}

export interface AudioEmitterPosition {
    x: number;
    y: number;
    maxDistance: number;
    minDistance?: number;
    rolloffFactor?: number;
    falloffModel?: FalloffModel;
    isOccludedByWall?: boolean;
}

export interface SpatialAudioResult {
    effectiveVolume: number; // 0.0 to 1.0
    panLeft: number;        // 0.0 to 1.0
    panRight: number;       // 0.0 to 1.0
    distance: number;
    isAudible: boolean;
}

export class SpatialAudioEngine {
    private static readonly OCCLUSION_ATTENUATION = 0.50; // -50% volume through walls

    /**
     * Calculates the Euclidean distance between listener and emitter.
     */
    public static calculateDistance(listener: AudioListenerPosition, emitter: AudioEmitterPosition): number {
        const dx = emitter.x - listener.x;
        const dy = emitter.y - listener.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * Calculates distance-based volume attenuation.
     */
    public static calculateAttenuation(distance: number, emitter: AudioEmitterPosition): number {
        const minDistance = emitter.minDistance ?? 1;
        const maxDistance = emitter.maxDistance;
        const rolloff = emitter.rolloffFactor ?? 1.0;
        const model = emitter.falloffModel ?? "INVERSE_DISTANCE";

        if (distance <= minDistance) return 1.0;
        if (distance >= maxDistance) return 0.0;

        let volume = 0.0;
        switch (model) {
            case "LINEAR":
                volume = 1.0 - (distance - minDistance) / (maxDistance - minDistance);
                break;
            case "EXPONENTIAL":
                volume = Math.pow(Math.max(0, 1.0 - (distance - minDistance) / (maxDistance - minDistance)), rolloff * 2);
                break;
            case "INVERSE_DISTANCE":
            default:
                volume = minDistance / (minDistance + rolloff * (distance - minDistance));
                break;
        }

        const clamped = Math.min(1.0, Math.max(0.0, volume));
        return emitter.isOccludedByWall ? clamped * this.OCCLUSION_ATTENUATION : clamped;
    }

    /**
     * Computes constant-power stereo pan law (cos / sin) based on relative horizontal angle.
     */
    public static calculateStereoPan(listener: AudioListenerPosition, emitter: AudioEmitterPosition): { left: number; right: number } {
        const dx = emitter.x - listener.x;
        const dy = emitter.y - listener.y;

        if (dx === 0 && dy === 0) {
            return { left: Math.SQRT1_2, right: Math.SQRT1_2 };
        }

        const angle = Math.atan2(dx, dy); // -PI to PI
        const normalizedAngle = (angle + Math.PI) / (2 * Math.PI); // 0.0 (Left) to 1.0 (Right)

        // Constant power panning curve: cos(theta) and sin(theta)
        const theta = normalizedAngle * (Math.PI / 2);
        return {
            left: Math.round(Math.cos(theta) * 1000) / 1000,
            right: Math.round(Math.sin(theta) * 1000) / 1000,
        };
    }

    /**
     * Processes full 2D spatial acoustic rendering for an emitter relative to a listener.
     */
    public static renderAudio(listener: AudioListenerPosition, emitter: AudioEmitterPosition): SpatialAudioResult {
        const distance = this.calculateDistance(listener, emitter);
        const volume = this.calculateAttenuation(distance, emitter);
        const pan = this.calculateStereoPan(listener, emitter);

        return {
            effectiveVolume: Math.round(volume * 1000) / 1000,
            panLeft: Math.round(pan.left * volume * 1000) / 1000,
            panRight: Math.round(pan.right * volume * 1000) / 1000,
            distance: Math.round(distance * 100) / 100,
            isAudible: volume > 0.001,
        };
    }
}
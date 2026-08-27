/**
 * Overland Trade Caravan Escort & Dynamic Ambush Mission Engine for OpenAO MMORPG.
 * Simulates route waypoint progression, cargo-value-scaled bandit ambush probabilities,
 * escort player protection radius enforcement, and milestone gold delivery rewards.
 */

export interface CaravanWaypoint {
    waypointId: string;
    mapId: number;
    x: number;
    y: number;
}

export interface TradeCargoManifest {
    manifestId: string;
    cargoName: string;
    cargoValueGold: number;
    baseRewardGold: number;
}

export interface CaravanMissionState {
    missionId: string;
    playerId: string;
    manifest: TradeCargoManifest;
    waypoints: CaravanWaypoint[];
    currentWaypointIndex: number;
    cartCurrentHp: number;
    cartMaxHp: number;
    isCompleted: boolean;
    isFailed: boolean;
}

export interface CaravanTickResult {
    missionId: string;
    currentWaypointIndex: number;
    isAmbushTriggered: boolean;
    isCompleted: boolean;
    isFailed: boolean;
    rewardGoldAwarded?: number;
    reason?: string;
}

export class CaravanEscortTradeEngine {
    public static readonly ESCORT_PROTECTION_RADIUS = 8.0; // 8 tiles

    /**
     * Initializes an active caravan escort mission.
     */
    public static startMission(
        playerId: string,
        manifest: TradeCargoManifest,
        waypoints: CaravanWaypoint[],
        cartMaxHp = 500
    ): CaravanMissionState {
        return {
            missionId: `caravan_${playerId}_${Date.now()}`,
            playerId,
            manifest,
            waypoints,
            currentWaypointIndex: 0,
            cartCurrentHp: cartMaxHp,
            cartMaxHp,
            isCompleted: false,
            isFailed: false,
        };
    }

    /**
     * Calculates the dynamic bandit ambush probability for a waypoint tick.
     * Base 10% + 5% per 10,000 gold of cargo value (clamped at max 75%).
     */
    public static calculateAmbushProbability(cargoValueGold: number): number {
        const valueIncrement = Math.floor(Math.max(0, cargoValueGold) / 10000);
        const chance = 0.10 + valueIncrement * 0.05;
        const clamped = Math.min(0.75, Math.max(0.10, chance));
        return Math.round(clamped * 1000) / 1000;
    }

    /**
     * Advances caravan to next waypoint if player is within the escort protection radius.
     */
    public static advanceWaypoint(
        state: CaravanMissionState,
        playerPos: { x: number; y: number },
        rng: () => number = Math.random
    ): CaravanTickResult {
        if (state.isCompleted || state.isFailed) {
            return {
                missionId: state.missionId,
                currentWaypointIndex: state.currentWaypointIndex,
                isAmbushTriggered: false,
                isCompleted: state.isCompleted,
                isFailed: state.isFailed,
                reason: "Mission is already concluded.",
            };
        }

        const currentWaypoint = state.waypoints[state.currentWaypointIndex];
        if (!currentWaypoint) {
            state.isCompleted = true;
            return {
                missionId: state.missionId,
                currentWaypointIndex: state.currentWaypointIndex,
                isAmbushTriggered: false,
                isCompleted: true,
                isFailed: false,
            };
        }

        // Check player escort radius distance
        const dx = playerPos.x - currentWaypoint.x;
        const dy = playerPos.y - currentWaypoint.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > this.ESCORT_PROTECTION_RADIUS) {
            return {
                missionId: state.missionId,
                currentWaypointIndex: state.currentWaypointIndex,
                isAmbushTriggered: false,
                isCompleted: false,
                isFailed: false,
                reason: "Player is too far from caravan cart! Escort radius exceeded.",
            };
        }

        // Roll ambush check
        const ambushChance = this.calculateAmbushProbability(state.manifest.cargoValueGold);
        const isAmbushTriggered = rng() < ambushChance;

        state.currentWaypointIndex += 1;

        // Check final destination reached
        if (state.currentWaypointIndex >= state.waypoints.length) {
            state.isCompleted = true;
            // Payout scaled by remaining cart health ratio
            const healthRatio = Math.max(0.10, state.cartCurrentHp / state.cartMaxHp);
            const payout = Math.floor(state.manifest.baseRewardGold * healthRatio);

            return {
                missionId: state.missionId,
                currentWaypointIndex: state.currentWaypointIndex,
                isAmbushTriggered,
                isCompleted: true,
                isFailed: false,
                rewardGoldAwarded: payout,
            };
        }

        return {
            missionId: state.missionId,
            currentWaypointIndex: state.currentWaypointIndex,
            isAmbushTriggered,
            isCompleted: false,
            isFailed: false,
        };
    }
}
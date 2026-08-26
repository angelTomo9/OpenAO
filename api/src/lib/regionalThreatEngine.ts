/**
 * Dynamic Regional Threat Level Scaling Engine for OpenAO MMORPG.
 * Scales zone difficulty, monster stats, and elite spawn rates dynamically based on
 * the density and average level of active players to combat high-level farming in low-level zones.
 */

export interface ZoneConfiguration {
    zoneId: string;
    baseLevel: number;
    maxScalingLevel: number;
    densityThresholdSoft: number; // Number of players before threat scaling starts
    densityThresholdHard: number; // Number of players where max threat scaling is reached
}

export interface PlayerInfo {
    playerId: string;
    level: number;
}

export interface RegionalThreatState {
    scaledMonsterLevel: number;
    monsterDamageMultiplier: number;
    monsterHealthMultiplier: number;
    eliteSpawnChancePercent: number; // e.g. 5.0 for 5%
    isOvercrowded: boolean;
}

export class RegionalThreatEngine {
    /**
     * Evaluates the current threat state of a zone based on active player demographics.
     */
    public static evaluateZoneThreat(
        config: ZoneConfiguration,
        activePlayers: PlayerInfo[]
    ): RegionalThreatState {
        const playerCount = activePlayers.length;

        // Baseline default state
        const baseline: RegionalThreatState = {
            scaledMonsterLevel: config.baseLevel,
            monsterDamageMultiplier: 1.0,
            monsterHealthMultiplier: 1.0,
            eliteSpawnChancePercent: 1.0,
            isOvercrowded: false,
        };

        if (playerCount === 0) {
            return baseline;
        }

        let totalLevel = 0;
        for (const p of activePlayers) {
            totalLevel += p.level;
        }
        const averagePlayerLevel = totalLevel / playerCount;

        // If the zone is heavily populated and average player level exceeds the zone's base level,
        // threat begins to scale up.
        if (playerCount > config.densityThresholdSoft && averagePlayerLevel > config.baseLevel) {
            // Calculate how deep into the "overcrowded" territory we are (0.0 to 1.0)
            const crowdFactorRaw = (playerCount - config.densityThresholdSoft) / 
                                   (config.densityThresholdHard - config.densityThresholdSoft);
            const crowdFactor = Math.min(1.0, Math.max(0.0, crowdFactorRaw));

            // Calculate how far the average level exceeds the base level, up to the max scaling bound
            const levelExceedanceRaw = (averagePlayerLevel - config.baseLevel) / 
                                       Math.max(1, (config.maxScalingLevel - config.baseLevel));
            const levelFactor = Math.min(1.0, Math.max(0.0, levelExceedanceRaw));

            // Threat intensity is a combination of population density and average level disparity
            const threatIntensity = (crowdFactor * 0.6) + (levelFactor * 0.4);

            // Scale Monster Level
            const levelSpan = config.maxScalingLevel - config.baseLevel;
            baseline.scaledMonsterLevel = config.baseLevel + Math.floor(levelSpan * threatIntensity);

            // Scale Combat Stats (Up to +200% Health, +100% Damage at max threat)
            baseline.monsterHealthMultiplier = 1.0 + (2.0 * threatIntensity);
            baseline.monsterDamageMultiplier = 1.0 + (1.0 * threatIntensity);

            // Scale Elite Spawn Rate (From 1% up to 15% at max threat)
            baseline.eliteSpawnChancePercent = 1.0 + (14.0 * threatIntensity);
            baseline.isOvercrowded = crowdFactor > 0.5;
        }

        return baseline;
    }
}
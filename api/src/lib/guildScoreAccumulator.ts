/**
 * Seasonal Guild Score & Tier Ranking Engine for OpenAO MMORPG.
 * Accumulates PvP kills, boss clears, territory control, and gold donations,
 * calculating tier brackets and end-of-season rating decays.
 */

export type GuildRankingTier = "BRONZE" | "SILVER" | "GOLD" | "DIAMOND" | "GRANDMASTER";

export type GuildScoreEventType =
    | "PVP_KILL"
    | "PVP_ENEMY_GUILD_KILL"
    | "DUNGEON_BOSS_CLEAR"
    | "TERRITORY_CASTLE_TICK"
    | "GOLD_VAULT_DONATION";

export interface GuildScoreEvent {
    type: GuildScoreEventType;
    pointsMultiplier?: number;
    goldAmount?: number;
}

export interface GuildTierBenefits {
    tier: GuildRankingTier;
    maxMembers: number;
    experienceBonusPercent: number;
    goldBonusPercent: number;
    hasExclusiveCastlePortal: boolean;
}

export const TIER_CONFIGS: Record<GuildRankingTier, { minScore: number; benefits: GuildTierBenefits }> = {
    BRONZE: {
        minScore: 0,
        benefits: { tier: "BRONZE", maxMembers: 10, experienceBonusPercent: 0, goldBonusPercent: 0, hasExclusiveCastlePortal: false },
    },
    SILVER: {
        minScore: 1000,
        benefits: { tier: "SILVER", maxMembers: 15, experienceBonusPercent: 2, goldBonusPercent: 0, hasExclusiveCastlePortal: false },
    },
    GOLD: {
        minScore: 5000,
        benefits: { tier: "GOLD", maxMembers: 20, experienceBonusPercent: 5, goldBonusPercent: 5, hasExclusiveCastlePortal: false },
    },
    DIAMOND: {
        minScore: 15000,
        benefits: { tier: "DIAMOND", maxMembers: 25, experienceBonusPercent: 8, goldBonusPercent: 8, hasExclusiveCastlePortal: false },
    },
    GRANDMASTER: {
        minScore: 35000,
        benefits: { tier: "GRANDMASTER", maxMembers: 30, experienceBonusPercent: 12, goldBonusPercent: 12, hasExclusiveCastlePortal: true },
    },
};

export class GuildScoreAccumulator {
    public static calculateEventPoints(event: GuildScoreEvent): number {
        const mult = event.pointsMultiplier ?? 1.0;

        switch (event.type) {
            case "PVP_KILL":
                return Math.round(10 * mult);
            case "PVP_ENEMY_GUILD_KILL":
                return Math.round(25 * mult);
            case "DUNGEON_BOSS_CLEAR":
                return Math.round(100 * mult);
            case "TERRITORY_CASTLE_TICK":
                return Math.round(5 * mult);
            case "GOLD_VAULT_DONATION": {
                const gold = event.goldAmount ?? 0;
                return Math.floor((gold / 1000) * mult);
            }
        }
    }

    public static getTierForScore(score: number): GuildTierBenefits {
        if (score >= TIER_CONFIGS.GRANDMASTER.minScore) return TIER_CONFIGS.GRANDMASTER.benefits;
        if (score >= TIER_CONFIGS.DIAMOND.minScore) return TIER_CONFIGS.DIAMOND.benefits;
        if (score >= TIER_CONFIGS.GOLD.minScore) return TIER_CONFIGS.GOLD.benefits;
        if (score >= TIER_CONFIGS.SILVER.minScore) return TIER_CONFIGS.SILVER.benefits;
        return TIER_CONFIGS.BRONZE.benefits;
    }

    public static computeSeasonResetScore(currentScore: number, decayFraction = 0.50): number {
        // Retains 50% of earned score above Bronze floor into next season
        return Math.max(0, Math.floor(currentScore * (1.0 - decayFraction)));
    }
}
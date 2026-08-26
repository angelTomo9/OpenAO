/**
 * Tier-Based Banking Compound Interest & Financial Simulation Engine for OpenAO MMORPG.
 * Simulates progressive APY tiers, compound interest accrual, withdrawal penalties,
 * and maximum uncollected interest ceilings.
 */

export interface BankAccountState {
    accountId: string;
    characterId: string;
    principalGold: number;
    uncollectedInterestGold: number;
    lastInterestAccrualEpochMs: number;
    depositTimestampEpochMs: number;
}

export interface InterestTier {
    tierName: string;
    minGold: number;
    maxGold: number;
    apyPercent: number; // e.g. 2.5 = 2.5%
}

export const BANK_INTEREST_TIERS: InterestTier[] = [
    { tierName: "TIER_1_STANDARD", minGold: 0, maxGold: 10000, apyPercent: 1.5 },
    { tierName: "TIER_2_PREMIUM", minGold: 10001, maxGold: 100000, apyPercent: 2.5 },
    { tierName: "TIER_3_ROYAL", minGold: 100001, maxGold: 1000000, apyPercent: 3.5 },
    { tierName: "TIER_4_SOVEREIGN", minGold: 1000001, maxGold: Infinity, apyPercent: 1.0 }, // Anti-inflation bracket
];

export class BankInterestEngine {
    private static readonly MS_PER_DAY = 24 * 60 * 60 * 1000;
    private static readonly MAX_UNCOLLECTED_DAYS = 30; // Max 30 days of uncollected interest
    private static readonly EARLY_WITHDRAWAL_FEE_PERCENT = 0.005; // 0.5% fee if withdrawn < 24h

    /**
     * Resolves effective progressive APY for a given principal balance.
     */
    public static getEffectiveApy(principal: number): number {
        if (principal <= 0) return 0;

        let totalWeightedApy = 0;
        let accountedGold = 0;

        for (const tier of BANK_INTEREST_TIERS) {
            if (principal > tier.minGold) {
                const taxableInThisTier = Math.min(principal, tier.maxGold) - tier.minGold;
                totalWeightedApy += taxableInThisTier * (tier.apyPercent / 100);
                accountedGold += taxableInThisTier;
            }
        }

        return accountedGold > 0 ? (totalWeightedApy / principal) * 100 : 0;
    }

    /**
     * Calculates accrued compound interest over elapsed time.
     */
    public static computeAccruedInterest(
        account: BankAccountState,
        currentEpochMs: number
    ): { accruedGold: number; elapsedDays: number; capped: boolean } {
        if (account.principalGold <= 0) {
            return { accruedGold: 0, elapsedDays: 0, capped: false };
        }

        const elapsedMs = Math.max(0, currentEpochMs - account.lastInterestAccrualEpochMs);
        const rawDays = elapsedMs / this.MS_PER_DAY;
        const elapsedDays = Math.min(this.MAX_UNCOLLECTED_DAYS, rawDays);
        const capped = rawDays > this.MAX_UNCOLLECTED_DAYS;

        const effectiveApyPercent = this.getEffectiveApy(account.principalGold);
        const dailyRate = (effectiveApyPercent / 100) / 365;

        // Compound formula: P * ((1 + r)^days - 1)
        const compoundFactor = Math.pow(1 + dailyRate, elapsedDays) - 1;
        const accrued = Math.floor(account.principalGold * compoundFactor);

        return {
            accruedGold: accrued,
            elapsedDays: Math.round(elapsedDays * 100) / 100,
            capped,
        };
    }

    /**
     * Applies interest accrual to account state.
     */
    public static applyAccrual(account: BankAccountState, currentEpochMs: number): number {
        const { accruedGold } = this.computeAccruedInterest(account, currentEpochMs);
        account.uncollectedInterestGold += accruedGold;
        account.lastInterestAccrualEpochMs = currentEpochMs;
        return accruedGold;
    }

    /**
     * Calculates withdrawal amount and early penalty fee.
     */
    public static processWithdrawal(
        account: BankAccountState,
        withdrawAmount: number,
        currentEpochMs: number
    ): { netGoldReceived: number; feePaid: number; isEarlyPenalty: boolean } {
        const available = account.principalGold;
        const toWithdraw = Math.min(available, Math.max(1, withdrawAmount));

        const isEarly = (currentEpochMs - account.depositTimestampEpochMs) < this.MS_PER_DAY;
        const fee = isEarly ? Math.ceil(toWithdraw * this.EARLY_WITHDRAWAL_FEE_PERCENT) : 0;
        const net = toWithdraw - fee;

        account.principalGold -= toWithdraw;
        return {
            netGoldReceived: net,
            feePaid: fee,
            isEarlyPenalty: isEarly,
        };
    }
}
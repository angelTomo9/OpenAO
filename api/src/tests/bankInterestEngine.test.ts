import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { BankInterestEngine, BankAccountState } from "../lib/bankInterestEngine.js";

describe("BankInterestEngine Compound Interest & Banking", () => {
    const epochNow = 1787740800000;
    const msPerDay = 24 * 60 * 60 * 1000;

    it("calculates progressive weighted APY across tier brackets", () => {
        // 50,000 gold spans Tier 1 (10,000 @ 1.5%) and Tier 2 (40,000 @ 2.5%)
        const apy = BankInterestEngine.getEffectiveApy(50000);
        assert.ok(apy > 2.0 && apy < 2.5);
    });

    it("accrues compound interest over elapsed days", () => {
        const account: BankAccountState = {
            accountId: "bank_01",
            characterId: "char_55",
            principalGold: 100000,
            uncollectedInterestGold: 0,
            lastInterestAccrualEpochMs: epochNow - (10 * msPerDay), // 10 days ago
            depositTimestampEpochMs: epochNow - (30 * msPerDay),
        };

        const { accruedGold, elapsedDays, capped } = BankInterestEngine.computeAccruedInterest(account, epochNow);
        assert.equal(elapsedDays, 10);
        assert.equal(capped, false);
        assert.ok(accruedGold > 0);
    });

    it("applies early withdrawal penalty fee when withdrawing within 24 hours", () => {
        const freshAccount: BankAccountState = {
            accountId: "bank_02",
            characterId: "char_99",
            principalGold: 10000,
            uncollectedInterestGold: 0,
            lastInterestAccrualEpochMs: epochNow,
            depositTimestampEpochMs: epochNow - (2 * 60 * 60 * 1000), // 2 hours ago
        };

        const res = BankInterestEngine.processWithdrawal(freshAccount, 5000, epochNow);
        assert.equal(res.isEarlyPenalty, true);
        assert.equal(res.feePaid, 25); // 0.5% of 5000 = 25 gold
        assert.equal(res.netGoldReceived, 4975);
        assert.equal(freshAccount.principalGold, 5000);
    });
});
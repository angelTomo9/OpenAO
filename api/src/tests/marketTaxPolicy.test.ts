import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MarketTaxPolicyEngine } from "../lib/marketTaxPolicy.js";

describe("MarketTaxPolicyEngine City Alignments & Tariffs", () => {
    it("applies allied low tax rate for Royal citizens in Royal Capital", () => {
        const res = MarketTaxPolicyEngine.computeMarketTax({
            listingPriceGold: 10000,
            sellerAlignment: "ROYAL_CITIZEN",
            buyerAlignment: "ROYAL_CITIZEN",
            cityJurisdiction: "ROYAL_CAPITAL",
        });

        assert.equal(res.taxRatePercent, 3.0);
        assert.equal(res.totalTaxPaidGold, 300);
        assert.equal(res.netSellerProceedsGold, 9700);
        assert.equal(res.treasuryDepositGold, 240); // 80% of 300
        assert.equal(res.goldSinkBurntGold, 60); // 20% of 300
        assert.equal(res.isBlackMarketTariff, false);
    });

    it("applies steep black market tariff for Chaos Outlaws in Royal Capital", () => {
        const res = MarketTaxPolicyEngine.computeMarketTax({
            listingPriceGold: 10000,
            sellerAlignment: "CHAOS_OUTLAW",
            buyerAlignment: "ROYAL_CITIZEN",
            cityJurisdiction: "ROYAL_CAPITAL",
        });

        assert.equal(res.taxRatePercent, 15.0);
        assert.equal(res.totalTaxPaidGold, 1500);
        assert.equal(res.isBlackMarketTariff, true);
    });

    it("grants 50% discount to ruling mayor guild members", () => {
        const res = MarketTaxPolicyEngine.computeMarketTax({
            listingPriceGold: 10000,
            sellerAlignment: "ROYAL_CITIZEN",
            buyerAlignment: "ROYAL_CITIZEN",
            cityJurisdiction: "ROYAL_CAPITAL",
            isMayorGuildMember: true,
        });

        // 3.0% halved to 1.5%
        assert.equal(res.taxRatePercent, 1.5);
        assert.equal(res.totalTaxPaidGold, 150);
        assert.equal(res.netSellerProceedsGold, 9850);
    });
});
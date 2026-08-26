/**
 * City Alignment Market Transaction Tax & Tariff Engine for OpenAO MMORPG.
 * Simulates faction alignments, city governance tariffs, black market surcharges,
 * and municipal treasury revenue distribution.
 */

export type CharacterFactionAlignment = "ROYAL_CITIZEN" | "IMPERIAL_LEGION" | "CHAOS_OUTLAW" | "NEUTRAL_NOMAD";
export type CityJurisdiction = "ROYAL_CAPITAL" | "IMPERIAL_STRONGHOLD" | "CHAOS_HAVEN" | "FREE_TRADE_OUTPOST";

export interface MarketTaxCalculationParams {
    listingPriceGold: number;
    sellerAlignment: CharacterFactionAlignment;
    buyerAlignment: CharacterFactionAlignment;
    cityJurisdiction: CityJurisdiction;
    isMayorGuildMember?: boolean; // Guild controlling the city gets 50% tax discount
}

export interface MarketTaxCalculationResult {
    listingPriceGold: number;
    taxRatePercent: number; // e.g. 5.0 = 5%
    totalTaxPaidGold: number;
    netSellerProceedsGold: number;
    treasuryDepositGold: number; // 80% to city vault
    goldSinkBurntGold: number; // 20% permanently removed from economy
    isBlackMarketTariff: boolean;
}

export class MarketTaxPolicyEngine {
    private static readonly BASE_TAX_ALLIED = 0.03; // 3%
    private static readonly BASE_TAX_NEUTRAL = 0.06; // 6%
    private static readonly BASE_TAX_FREE_OUTPOST = 0.04; // 4%
    private static readonly BLACK_MARKET_SURCHARGE = 0.15; // 15% for outlaws in hostile capitals
    private static readonly TREASURY_SHARE = 0.80; // 80% to city treasury

    public static computeMarketTax(params: MarketTaxCalculationParams): MarketTaxCalculationResult {
        const price = Math.max(1, params.listingPriceGold);
        let taxRate = this.BASE_TAX_NEUTRAL;
        let isBlackMarket = false;

        if (params.cityJurisdiction === "FREE_TRADE_OUTPOST") {
            taxRate = this.BASE_TAX_FREE_OUTPOST;
        } else if (params.cityJurisdiction === "ROYAL_CAPITAL") {
            if (params.sellerAlignment === "ROYAL_CITIZEN") {
                taxRate = this.BASE_TAX_ALLIED;
            } else if (params.sellerAlignment === "CHAOS_OUTLAW") {
                taxRate = this.BLACK_MARKET_SURCHARGE;
                isBlackMarket = true;
            } else {
                taxRate = this.BASE_TAX_NEUTRAL;
            }
        } else if (params.cityJurisdiction === "IMPERIAL_STRONGHOLD") {
            if (params.sellerAlignment === "IMPERIAL_LEGION") {
                taxRate = this.BASE_TAX_ALLIED;
            } else if (params.sellerAlignment === "CHAOS_OUTLAW") {
                taxRate = this.BLACK_MARKET_SURCHARGE;
                isBlackMarket = true;
            } else {
                taxRate = this.BASE_TAX_NEUTRAL;
            }
        } else if (params.cityJurisdiction === "CHAOS_HAVEN") {
            if (params.sellerAlignment === "CHAOS_OUTLAW") {
                taxRate = this.BASE_TAX_ALLIED;
            } else {
                taxRate = this.BASE_TAX_NEUTRAL;
            }
        }

        // Mayor / Ruling guild member discount
        if (params.isMayorGuildMember) {
            taxRate *= 0.50;
        }

        const totalTaxPaid = Math.max(1, Math.ceil(price * taxRate));
        const netSeller = Math.max(0, price - totalTaxPaid);

        const treasuryDeposit = Math.floor(totalTaxPaid * this.TREASURY_SHARE);
        const goldSinkBurnt = totalTaxPaid - treasuryDeposit;

        return {
            listingPriceGold: price,
            taxRatePercent: Math.round(taxRate * 10000) / 100,
            totalTaxPaidGold: totalTaxPaid,
            netSellerProceedsGold: netSeller,
            treasuryDepositGold: treasuryDeposit,
            goldSinkBurntGold: goldSinkBurnt,
            isBlackMarketTariff: isBlackMarket,
        };
    }
}
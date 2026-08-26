/**
 * Automated Market Maker (AMM) Liquidity Pool for OpenAO MMORPG.
 * Utilizes the Constant Product Formula (x * y = k) to facilitate instant,
 * decentralized trading of raw materials against a gold reserve without a peer-to-peer order book.
 */

export interface LiquidityPool {
    poolId: string;
    materialId: string;
    reserveMaterial: number; // x
    reserveGold: number;     // y
    k: number;               // x * y
}

export class AmmLiquidityPoolEngine {
    private static readonly LP_FEE_PERCENT = 0.01; // 1% fee

    /**
     * Initializes a new AMM pool and sets the constant product K.
     */
    public static initializePool(
        poolId: string,
        materialId: string,
        initialMaterial: number,
        initialGold: number
    ): LiquidityPool {
        if (!Number.isInteger(initialMaterial) || initialMaterial <= 0) {
            throw new Error("Initial material reserve must be a positive integer");
        }
        if (!Number.isInteger(initialGold) || initialGold <= 0) {
            throw new Error("Initial gold reserve must be a positive integer");
        }

        return {
            poolId,
            materialId,
            reserveMaterial: initialMaterial,
            reserveGold: initialGold,
            k: initialMaterial * initialGold,
        };
    }

    /**
     * Estimates how much Gold a player must pay to receive exactly `amountOut` of Material.
     */
    public static getBuyQuote(pool: LiquidityPool, materialAmountOut: number): number {
        if (!Number.isInteger(materialAmountOut) || materialAmountOut <= 0) {
            throw new Error("Buy quantity must be a positive integer");
        }
        if (materialAmountOut >= pool.reserveMaterial) {
            throw new Error("Insufficient material liquidity in pool");
        }

        // x * y = k
        // (x - dx) * (y + dy) = k
        // dy = (k / (x - dx)) - y
        const newMaterialReserve = pool.reserveMaterial - materialAmountOut;
        const newGoldReserve = pool.k / newMaterialReserve;
        const rawGoldRequired = newGoldReserve - pool.reserveGold;

        // Apply 1% fee on input gold
        const goldRequiredWithFee = rawGoldRequired / (1.0 - this.LP_FEE_PERCENT);
        return Math.ceil(goldRequiredWithFee);
    }

    /**
     * Executes a player BUY order (Player gives Gold, receives Material).
     */
    public static executeBuy(pool: LiquidityPool, materialAmountOut: number): { goldPaid: number } {
        const goldPaid = this.getBuyQuote(pool, materialAmountOut);

        pool.reserveMaterial -= materialAmountOut;
        pool.reserveGold += goldPaid;
        pool.k = pool.reserveMaterial * pool.reserveGold;

        return { goldPaid };
    }

    /**
     * Estimates how much Gold a player will receive by selling exactly `amountIn` of Material.
     */
    public static getSellQuote(pool: LiquidityPool, materialAmountIn: number): number {
        if (!Number.isInteger(materialAmountIn) || materialAmountIn <= 0) {
            return 0;
        }

        // Apply 1% fee on the input material before calculating gold output
        const effectiveMaterialIn = materialAmountIn * (1.0 - this.LP_FEE_PERCENT);

        // (x + dx) * (y - dy) = k
        // dy = y - (k / (x + dx))
        const newMaterialReserve = pool.reserveMaterial + effectiveMaterialIn;
        const newGoldReserve = pool.k / newMaterialReserve;
        const goldYield = Math.floor(pool.reserveGold - newGoldReserve);

        return Math.max(0, goldYield);
    }

    /**
     * Executes a player SELL order (Player gives Material, receives Gold).
     */
    public static executeSell(pool: LiquidityPool, materialAmountIn: number): { goldReceived: number } {
        if (!Number.isInteger(materialAmountIn) || materialAmountIn <= 0) {
            throw new Error("Sell quantity must be a positive integer");
        }

        const goldReceived = this.getSellQuote(pool, materialAmountIn);
        if (goldReceived <= 0) {
            throw new Error("Trade size too small to yield gold output");
        }

        pool.reserveMaterial += materialAmountIn;
        pool.reserveGold -= goldReceived;
        pool.k = pool.reserveMaterial * pool.reserveGold;

        return { goldReceived };
    }
}
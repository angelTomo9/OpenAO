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
    public static initializePool(poolId: string, materialId: string, initialMaterial: number, initialGold: number): LiquidityPool {
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
        if (materialAmountOut >= pool.reserveMaterial || materialAmountOut <= 0) {
            throw new Error("Insufficient liquidity for this trade size");
        }

        // x * y = k
        // (x - dx) * (y + dy) = k
        // y + dy = k / (x - dx)
        // dy = (k / (x - dx)) - y
        const newMaterialReserve = pool.reserveMaterial - materialAmountOut;
        const newGoldReserve = pool.k / newMaterialReserve;
        const goldRequired = newGoldReserve - pool.reserveGold;

        // Apply 1% fee on the input
        const goldRequiredWithFee = goldRequired / (1.0 - this.LP_FEE_PERCENT);
        
        return Math.ceil(goldRequiredWithFee);
    }

    /**
     * Executes a player BUY order (Player gives Gold, receives Material).
     */
    public static executeBuy(pool: LiquidityPool, materialAmountOut: number): { goldPaid: number } {
        const goldPaid = this.getBuyQuote(pool, materialAmountOut);

        // Update reserves
        pool.reserveMaterial -= materialAmountOut;
        pool.reserveGold += goldPaid;
        
        // K increases slightly due to the fee being retained in the pool
        pool.k = pool.reserveMaterial * pool.reserveGold;

        return { goldPaid };
    }

    /**
     * Estimates how much Gold a player will receive by selling exactly `amountIn` of Material.
     */
    public static getSellQuote(pool: LiquidityPool, materialAmountIn: number): number {
        if (materialAmountIn <= 0) return 0;

        // Apply 1% fee on the input material before calculating
        const effectiveMaterialIn = materialAmountIn * (1.0 - this.LP_FEE_PERCENT);

        // (x + dx) * (y - dy) = k
        // y - dy = k / (x + dx)
        // dy = y - (k / (x + dx))
        const newMaterialReserve = pool.reserveMaterial + effectiveMaterialIn;
        const newGoldReserve = pool.k / newMaterialReserve;
        const goldYield = pool.reserveGold - newGoldReserve;

        if (goldYield >= pool.reserveGold) {
            throw new Error("Insufficient gold liquidity");
        }

        return Math.floor(goldYield);
    }

    /**
     * Executes a player SELL order (Player gives Material, receives Gold).
     */
    public static executeSell(pool: LiquidityPool, materialAmountIn: number): { goldReceived: number } {
        const goldReceived = this.getSellQuote(pool, materialAmountIn);

        // Update reserves
        pool.reserveMaterial += materialAmountIn;
        pool.reserveGold -= goldReceived;

        // K increases slightly due to the fee
        pool.k = pool.reserveMaterial * pool.reserveGold;

        return { goldReceived };
    }
}
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AmmLiquidityPoolEngine, LiquidityPool } from "../lib/ammLiquidityPool.js";

describe("Automated Market Maker (AMM) Liquidity Pool", () => {
    let pool: LiquidityPool;

    it("initializes the pool and calculates constant product K", () => {
        // 10,000 Iron Ore, 50,000 Gold
        pool = AmmLiquidityPoolEngine.initializePool("pool_iron", "item_iron_ore", 10000, 50000);
        assert.equal(pool.k, 500000000);
    });

    it("executes a BUY order and shifts the price curve", () => {
        // Player wants to buy 1,000 Iron Ore (10% of liquidity)
        const initialK = pool.k;
        const res = AmmLiquidityPoolEngine.executeBuy(pool, 1000);
        
        // Exact math without fee: (500000000 / 9000) - 50000 = 5555.55 Gold
        // With 1% fee: 5555.55 / 0.99 = 5611.67 => ceil => 5612
        assert.equal(res.goldPaid, 5612);

        assert.equal(pool.reserveMaterial, 9000);
        assert.equal(pool.reserveGold, 55612);
        
        // K should increase because the fee is kept in the pool
        assert.ok(pool.k > initialK);
        assert.equal(pool.k, 9000 * 55612); // 500,508,000
    });

    it("executes a SELL order and shifts the price curve", () => {
        const initialK = pool.k; // 500,508,000
        
        // Player wants to sell 2,000 Iron Ore back into the pool
        const res = AmmLiquidityPoolEngine.executeSell(pool, 2000);
        
        // Effective material in (minus 1% fee) = 1980
        // New material reserve = 9000 + 1980 = 10980
        // New gold reserve = 500508000 / 10980 = 45583.6
        // Gold yield = 55612 - 45583.6 = 10028.4 => floor => 10028
        assert.equal(res.goldReceived, 10028);

        assert.equal(pool.reserveMaterial, 11000); // Pool actually gets all 2000
        assert.equal(pool.reserveGold, 45584);
        
        assert.ok(pool.k > initialK);
        assert.equal(pool.k, 11000 * 45584); // 501,424,000
    });

    it("throws error if buying exceeds available material liquidity", () => {
        assert.throws(() => {
            AmmLiquidityPoolEngine.executeBuy(pool, 15000); // Only 11000 available
        });
    });
});
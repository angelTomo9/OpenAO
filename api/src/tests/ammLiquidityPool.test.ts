import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AmmLiquidityPoolEngine, LiquidityPool } from "../lib/ammLiquidityPool.js";

describe("Automated Market Maker (AMM) Liquidity Pool Refined", () => {
    let pool: LiquidityPool;

    it("initializes pool and enforces positive integer invariants", () => {
        pool = AmmLiquidityPoolEngine.initializePool("pool_iron", "item_iron_ore", 10000, 50000);
        assert.equal(pool.k, 500000000);

        assert.throws(() => {
            AmmLiquidityPoolEngine.initializePool("bad", "item", -10, 50000);
        });
    });

    it("executes BUY order with fee retention in pool", () => {
        const initialK = pool.k;
        const res = AmmLiquidityPoolEngine.executeBuy(pool, 1000);
        assert.equal(res.goldPaid, 5612);
        assert.equal(pool.reserveMaterial, 9000);
        assert.ok(pool.k > initialK);
    });

    it("executes SELL order and prevents zero/negative input corruption", () => {
        const initialK = pool.k;
        const res = AmmLiquidityPoolEngine.executeSell(pool, 2000);
        assert.equal(res.goldReceived, 10028);
        assert.equal(pool.reserveMaterial, 11000);
        assert.ok(pool.k > initialK);

        // Negative or zero sell throws rather than corrupting state
        assert.throws(() => {
            AmmLiquidityPoolEngine.executeSell(pool, 0);
        });
        assert.throws(() => {
            AmmLiquidityPoolEngine.executeSell(pool, -500);
        });
    });
});
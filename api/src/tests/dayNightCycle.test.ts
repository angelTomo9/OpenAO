import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DayNightCycleEngine } from "../lib/dayNightCycle.js";

describe("DayNightCycleEngine Solar & Lunar Curves", () => {
    it("calculates full daylight at noon tick", () => {
        // Noon is halfway through the day: 7200 ticks
        const state = DayNightCycleEngine.calculateState(7200);
        assert.equal(state.phase, "DAY");
        assert.equal(state.gameHour, 12);
        assert.equal(state.ambientIntensity, 1.0);
        assert.ok(state.ambientColor.r >= 0.95);
    });

    it("calculates midnight darkness with lunar bonus", () => {
        // Midnight at tick 0, Day 4 (Full Moon)
        const fullMoonTick = 4 * DayNightCycleEngine.TICKS_PER_DAY;
        const state = DayNightCycleEngine.calculateState(fullMoonTick);

        assert.equal(state.phase, "NIGHT");
        assert.equal(state.gameHour, 0);
        assert.equal(state.lunarPhase, "FULL_MOON");
        assert.equal(state.lunarLightBonus, 0.25);
        assert.equal(state.ambientIntensity, 0.40); // 0.15 base + 0.25 full moon bonus
    });

    it("overrides ambient lighting for indoor dungeon maps", () => {
        const state = DayNightCycleEngine.calculateState(7200, true);
        assert.equal(state.isIndoors, true);
        assert.equal(state.ambientIntensity, 0.25);
    });
});
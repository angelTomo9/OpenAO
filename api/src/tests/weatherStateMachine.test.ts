import { describe, it, expect } from "vitest";
import { WeatherStateMachine } from "../lib/weatherStateMachine.js";

describe("WeatherStateMachine Biome Climatology and Spell Modifiers", () => {
    it("rolls sandstorms exclusively in arid desert biomes and never in tundra", () => {
        // Force roll towards sandstorm in desert (weight 25 out of 100, roll near max)
        const desertWeather = WeatherStateMachine.rollNextWeather("ARID_DESERT", () => 0.95);
        expect(desertWeather).toBe("SANDSTORM");

        // Any roll in Tundra must never produce Sandstorm
        const tundraWeather = WeatherStateMachine.rollNextWeather("FROZEN_TUNDRA", () => 0.95);
        expect(tundraWeather).not.toBe("SANDSTORM");
        expect(["CLEAR_SKY", "BLIZZARD", "DENSE_FOG"]).toContain(tundraWeather);
    });

    it("amplifies lightning spells and dampens fire during thunderstorms", () => {
        const mods = WeatherStateMachine.getWeatherModifiers("THUNDERSTORM");
        expect(mods.lightningSpellMultiplier).toBe(1.30); // +30% lightning
        expect(mods.fireSpellMultiplier).toBe(0.70);      // -30% fire
        expect(mods.lightningStrikeChancePerTick).toBeGreaterThan(0);
        expect(mods.movementSpeedMultiplier).toBeLessThan(1.0);
    });

    it("severely reduces vision tiles during dense fog", () => {
        const clearMods = WeatherStateMachine.getWeatherModifiers("CLEAR_SKY");
        const fogMods = WeatherStateMachine.getWeatherModifiers("DENSE_FOG");

        expect(fogMods.visibilityRangeTiles).toBeLessThan(clearMods.visibilityRangeTiles / 2);
    });
});
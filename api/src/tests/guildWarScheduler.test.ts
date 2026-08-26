import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { GuildWarScheduler, TerritoryState } from "../lib/guildWarScheduler.js";

describe("GuildWarScheduler Territory Control", () => {
    const createMockTerritory = (): TerritoryState => ({
        territoryId: "castle_blackrock",
        controllingGuildId: "guild_defenders",
        siegeWindow: { dayOfWeek: 6, startHour: 20, endHour: 22 }, // Saturday 20:00 to 22:00
        isSiegeActive: false,
        currentWarScores: new Map(),
        capturePointHolderGuildId: null,
    });

    it("activates siege mode and accumulates points for the capture point holder", () => {
        const territory = createMockTerritory();
        
        // Saturday at 20:15 UTC
        const activeDate = new Date(Date.UTC(2026, 7, 29, 20, 15, 0)); // August 29, 2026 is a Saturday

        // First tick activates the siege
        GuildWarScheduler.tickTerritory(territory, activeDate);
        assert.equal(territory.isSiegeActive, true);

        // Guild attackers claim the point
        territory.capturePointHolderGuildId = "guild_attackers";

        // Tick to score points
        GuildWarScheduler.tickTerritory(territory, activeDate);
        GuildWarScheduler.tickTerritory(territory, activeDate);

        assert.equal(territory.currentWarScores.get("guild_attackers"), 20);
    });

    it("resolves the siege and transfers ownership to highest scorer when time expires", () => {
        const territory = createMockTerritory();
        territory.isSiegeActive = true;
        territory.currentWarScores.set("guild_attackers", 500);
        territory.currentWarScores.set("guild_defenders", 300);

        // Saturday at 22:05 UTC (Siege window ended)
        const expiredDate = new Date(Date.UTC(2026, 7, 29, 22, 5, 0));

        GuildWarScheduler.tickTerritory(territory, expiredDate);

        assert.equal(territory.isSiegeActive, false);
        assert.equal(territory.controllingGuildId, "guild_attackers"); // Attackers won
        assert.equal(territory.currentWarScores.size, 0); // Scores reset
    });

    it("retains defending guild ownership if no one scores points during the siege", () => {
        const territory = createMockTerritory();
        territory.isSiegeActive = true;

        // Nobody claimed the capture point
        const expiredDate = new Date(Date.UTC(2026, 7, 29, 22, 5, 0));

        GuildWarScheduler.tickTerritory(territory, expiredDate);

        assert.equal(territory.isSiegeActive, false);
        assert.equal(territory.controllingGuildId, "guild_defenders"); // Defenders retained it
    });
});
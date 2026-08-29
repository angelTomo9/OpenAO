import { describe, it, expect } from "vitest";
import {
    RunicTotemShamanicAttunementEngine,
    PlacedTotem,
    PartyMemberTarget,
} from "../lib/runicTotemShamanicAttunement.js";

describe("RunicTotemShamanicAttunementEngine Totems & Storm Surge", () => {
    it("places Windfury Totem and pulses aura to party members in range", () => {
        const totem = RunicTotemShamanicAttunementEngine.placeTotem("shaman_01", "WINDFURY_TOTEM", 50, 50, 100000);
        expect(totem.totemType).toBe("WINDFURY_TOTEM");
        expect(totem.currentHp).toBe(500);

        const warrior: PartyMemberTarget = { playerId: "w1", location: { x: 55, y: 50 }, activeTotemBuffs: {}, isAlive: true }; // 5 tiles away
        const mageDistant: PartyMemberTarget = { playerId: "m1", location: { x: 90, y: 50 }, activeTotemBuffs: {}, isAlive: true }; // 40 tiles away

        const pulseRes = RunicTotemShamanicAttunementEngine.pulseTotemAuras([totem], [warrior, mageDistant], 100000);
        expect(pulseRes.affectedPartyCount).toBe(1);
        expect(pulseRes.isStormSurgeActive).toBe(false);
        expect(warrior.activeTotemBuffs.ATTACK_SPEED_PERCENT).toBe(35);
        expect(mageDistant.activeTotemBuffs.ATTACK_SPEED_PERCENT).toBeUndefined();
    });

    it("activates Elemental Storm Surge (+50% potency) when all 3 totem types are deployed", () => {
        const earthTotem = RunicTotemShamanicAttunementEngine.placeTotem("s", "EARTHWARDEN_TOTEM", 0, 0, 100000);
        const windTotem = RunicTotemShamanicAttunementEngine.placeTotem("s", "WINDFURY_TOTEM", 0, 0, 100000);
        const waterTotem = RunicTotemShamanicAttunementEngine.placeTotem("s", "TIDAL_WAVE_TOTEM", 0, 0, 100000);

        const ally: PartyMemberTarget = { playerId: "ally_01", location: { x: 2, y: 2 }, activeTotemBuffs: {}, isAlive: true };

        const pulse = RunicTotemShamanicAttunementEngine.pulseTotemAuras([earthTotem, windTotem, waterTotem], [ally], 100000);
        expect(pulse.isStormSurgeActive).toBe(true);

        // Earth base 40 * 1.5 = 60 Armor Rating
        expect(ally.activeTotemBuffs.ARMOR_RATING).toBe(60);
        // Tidal Wave base 80 * 1.5 = 120 HP Regen
        expect(ally.activeTotemBuffs.HEALTH_REGEN_PER_SEC).toBe(120);
    });

    it("destroys totem when damage reduces HP to 0 and excludes it from aura pulses", () => {
        const totem = RunicTotemShamanicAttunementEngine.placeTotem("s", "EARTHWARDEN_TOTEM", 0, 0, 100000);

        const dmgRes = RunicTotemShamanicAttunementEngine.damageTotem(totem, 500);
        expect(dmgRes.isDestroyed).toBe(true);
        expect(totem.currentHp).toBe(0);

        const ally: PartyMemberTarget = { playerId: "a", location: { x: 1, y: 1 }, activeTotemBuffs: {}, isAlive: true };
        const pulse = RunicTotemShamanicAttunementEngine.pulseTotemAuras([totem], [ally], 100000);
        expect(pulse.affectedPartyCount).toBe(0);
    });

    it("ignores expired totems beyond their 120s lifespan", () => {
        const oldTotem = RunicTotemShamanicAttunementEngine.placeTotem("s", "WINDFURY_TOTEM", 0, 0, 100000);
        // Current time: 250000 ms (150s later > 120s lifespan)
        const ally: PartyMemberTarget = { playerId: "a", location: { x: 1, y: 1 }, activeTotemBuffs: {}, isAlive: true };

        const pulse = RunicTotemShamanicAttunementEngine.pulseTotemAuras([oldTotem], [ally], 250000);
        expect(pulse.affectedPartyCount).toBe(0);
    });

    it("guards against unsupported totem types and dead party members", () => {
        expect(() => RunicTotemShamanicAttunementEngine.placeTotem("s", "LASER_TOTEM" as any)).toThrow(
            "Unsupported totem type"
        );

        const totem = RunicTotemShamanicAttunementEngine.placeTotem("s", "WINDFURY_TOTEM", 0, 0, 100000);
        const deadAlly: PartyMemberTarget = { playerId: "dead", location: { x: 1, y: 1 }, activeTotemBuffs: {}, isAlive: false };

        const pulse = RunicTotemShamanicAttunementEngine.pulseTotemAuras([totem], [deadAlly], 100000);
        expect(pulse.affectedPartyCount).toBe(0);
    });
});
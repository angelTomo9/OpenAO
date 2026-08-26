/**
 * Deterministic Dungeon Instance Key Generator & Scaling Engine for OpenAO MMORPG.
 * Generates tamper-proof instance tokens and calculates difficulty/party loot multipliers.
 */

import crypto from 'node:crypto';

export type DungeonDifficulty = "NORMAL" | "HEROIC" | "MYTHIC";

export interface InstanceDescriptor {
    dungeonId: string;
    partyLeaderId: string;
    partyMembers: string[];
    difficulty: DungeonDifficulty;
    seasonId: number;
    createdAtEpochMs: number;
}

export interface InstanceScalingResult {
    instanceKey: string;
    dungeonId: string;
    difficulty: DungeonDifficulty;
    monsterLevelBonus: number;
    monsterHpMultiplier: number;
    monsterDamageMultiplier: number;
    lootDropRateMultiplier: number;
    goldDropRateMultiplier: number;
    expiresAtEpochMs: number;
}

export class DungeonInstanceKeyGenerator {
    private static readonly INSTANCE_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours

    /**
     * Generates a deterministic, cryptographically signed instance key.
     */
    public static generateInstanceKey(
        descriptor: InstanceDescriptor,
        serverSecret: string
    ): string {
        const payload = `${descriptor.dungeonId}:${descriptor.partyLeaderId}:${descriptor.difficulty}:${descriptor.seasonId}:${descriptor.createdAtEpochMs}`;
        const signature = crypto
            .createHmac('sha256', serverSecret)
            .update(payload)
            .digest('hex')
            .slice(0, 16);

        return `inst_${descriptor.dungeonId}_${descriptor.difficulty}_${descriptor.createdAtEpochMs}_${signature}`;
    }

    /**
     * Verifies the authenticity and signature of an instance key.
     */
    public static verifyInstanceKey(
        instanceKey: string,
        descriptor: InstanceDescriptor,
        serverSecret: string
    ): boolean {
        const expected = this.generateInstanceKey(descriptor, serverSecret);
        return crypto.timingSafeEqual(Buffer.from(instanceKey), Buffer.from(expected));
    }

    /**
     * Calculates difficulty scaling, monster stat multipliers, and party loot bonuses.
     */
    public static computeInstanceScaling(
        descriptor: InstanceDescriptor,
        serverSecret: string
    ): InstanceScalingResult {
        const partySize = Math.max(1, Math.min(10, descriptor.partyMembers.length));

        let monsterLevelBonus = 0;
        let hpMult = 1.0;
        let dmgMult = 1.0;
        let lootMult = 1.0;
        let goldMult = 1.0;

        switch (descriptor.difficulty) {
            case "NORMAL":
                monsterLevelBonus = 0;
                hpMult = 1.0 + (partySize - 1) * 0.25; // Scales with party size
                dmgMult = 1.0;
                lootMult = 1.0;
                goldMult = 1.0;
                break;

            case "HEROIC":
                monsterLevelBonus = 5;
                hpMult = 2.0 + (partySize - 1) * 0.40;
                dmgMult = 1.45;
                lootMult = 1.85;
                goldMult = 2.0;
                break;

            case "MYTHIC":
                monsterLevelBonus = 12;
                hpMult = 3.5 + (partySize - 1) * 0.60;
                dmgMult = 2.2;
                lootMult = 3.5;
                goldMult = 4.0;
                break;
        }

        const instanceKey = this.generateInstanceKey(descriptor, serverSecret);
        const expiresAtEpochMs = descriptor.createdAtEpochMs + this.INSTANCE_TTL_MS;

        return {
            instanceKey,
            dungeonId: descriptor.dungeonId,
            difficulty: descriptor.difficulty,
            monsterLevelBonus,
            monsterHpMultiplier: Math.round(hpMult * 100) / 100,
            monsterDamageMultiplier: dmgMult,
            lootDropRateMultiplier: lootMult,
            goldDropRateMultiplier: goldMult,
            expiresAtEpochMs,
        };
    }
}
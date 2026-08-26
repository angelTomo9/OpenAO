import { describe, it, expect } from "vitest";
import { MercenaryContractEngine } from "../lib/mercenaryContractEngine.js";

describe("MercenaryContractEngine Recruitment, Wages & Loyalty Dynamics", () => {
    it("hires mercenary when player has sufficient gold", () => {
        const hireRes = MercenaryContractEngine.hireMercenary("p1", "veteran_swordsman", 1000, 100000);
        expect(hireRes.success).toBe(true);
        expect(hireRes.remainingGold).toBe(500); // 1000 - 500
        expect(hireRes.contract?.loyaltyPercent).toBe(80);
        expect(hireRes.contract?.status).toBe("ACTIVE");
    });

    it("rejects hiring when player lacks gold for upfront fee", () => {
        const hireRes = MercenaryContractEngine.hireMercenary("p1", "cleric_acolyte", 500, 100000);
        expect(hireRes.success).toBe(false);
        expect(hireRes.reason).toContain("Insufficient gold");
    });

    it("processes timely wage payment and boosts loyalty", () => {
        const contract = MercenaryContractEngine.hireMercenary("p1", "veteran_swordsman", 500, 100000).contract!;
        const wageRes = MercenaryContractEngine.processWageTick(contract, 200, 103600);

        expect(wageRes.status).toBe("ACTIVE");
        expect(wageRes.goldDeducted).toBe(25);
        expect(wageRes.remainingPlayerGold).toBe(175);
        expect(wageRes.loyaltyPercent).toBe(82); // +2 loyalty on on-time payment
    });

    it("triggers desertion when player defaults on wages consecutively", () => {
        const contract = MercenaryContractEngine.hireMercenary("p1", "veteran_swordsman", 500, 100000).contract!;

        // 1st missed wage (loyalty: 80 - 25 = 55)
        const w1 = MercenaryContractEngine.processWageTick(contract, 0, 103600);
        expect(w1.status).toBe("UNPAID_WARNING");
        expect(w1.hasDeserted).toBe(false);

        // 2nd missed wage (loyalty: 55 - 25 = 30)
        const w2 = MercenaryContractEngine.processWageTick(contract, 0, 107200);
        expect(w2.status).toBe("UNPAID_WARNING");

        // 3rd missed wage (loyalty: 30 - 25 = 5, but 3 consecutive defaults triggers DESERTED)
        const w3 = MercenaryContractEngine.processWageTick(contract, 0, 110800);
        expect(w3.status).toBe("DESERTED");
        expect(w3.hasDeserted).toBe(true);
    });
});
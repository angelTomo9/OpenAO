import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DialogueEngine, DialogueTree, CharacterContext } from "../lib/dialogueEngine.js";

describe("DialogueEngine Branching Node Traversal", () => {
    const mockTree: DialogueTree = {
        treeId: "guard_gate_01",
        initialNodeId: "node_greeting",
        nodes: {
            node_greeting: {
                nodeId: "node_greeting",
                speakerName: "Guard Captain",
                text: "Greetings {playerName}! The city of Banderbill is closed to thieves.",
                choices: [
                    {
                        choiceId: "c_ask_entry",
                        text: "I wish to enter peacefully.",
                        targetNodeId: "node_entry_rules",
                    },
                    {
                        choiceId: "c_bribe",
                        text: "Here is 50 gold to look the other way.",
                        targetNodeId: "node_bribed",
                        condition: { minGold: 50 },
                        actions: [{ type: "TAKE_GOLD", payload: 50 }],
                    },
                    {
                        choiceId: "c_hero_entry",
                        text: "I am the Hero of Ullathorpe.",
                        targetNodeId: "node_hero_welcome",
                        condition: { minLevel: 25, completedQuests: ["defeat_dragon"] },
                    },
                ],
            },
            node_entry_rules: {
                nodeId: "node_entry_rules",
                speakerName: "Guard Captain",
                text: "You must keep your weapons sheathed.",
                choices: [
                    {
                        choiceId: "c_agree",
                        text: "Understood.",
                        targetNodeId: null, // End dialogue
                    },
                ],
            },
            node_bribed: {
                nodeId: "node_bribed",
                speakerName: "Guard Captain",
                text: "Move along quickly before the King sees us.",
                choices: [],
            },
            node_hero_welcome: {
                nodeId: "node_hero_welcome",
                speakerName: "Guard Captain",
                text: "Welcome, champion! Open the gates!",
                choices: [],
            },
        },
    };

    const novicePlayer: CharacterContext = {
        name: "Angel",
        level: 5,
        characterClass: "mago",
        race: "humano",
        gold: 20,
        karma: 100,
        completedQuests: [],
        activeQuests: [],
    };

    const wealthyHero: CharacterContext = {
        name: "LegendaryHero",
        level: 30,
        characterClass: "paladin",
        race: "humano",
        gold: 500,
        karma: 500,
        completedQuests: ["defeat_dragon"],
        activeQuests: [],
    };

    it("interpolates player variables in node text", () => {
        const view = DialogueEngine.getNodeView(mockTree, "node_greeting", novicePlayer);
        assert.equal(view.text, "Greetings Angel! The city of Banderbill is closed to thieves.");
    });

    it("filters choices based on character conditions (gold & quests)", () => {
        const noviceView = DialogueEngine.getNodeView(mockTree, "node_greeting", novicePlayer);
        // Only 1 choice available (gold is 20 < 50, level 5 < 25)
        assert.equal(noviceView.choices.length, 1);
        assert.equal(noviceView.choices[0].choiceId, "c_ask_entry");

        const heroView = DialogueEngine.getNodeView(mockTree, "node_greeting", wealthyHero);
        // All 3 choices available
        assert.equal(heroView.choices.length, 3);
    });

    it("executes choice and returns actions and target node", () => {
        const result = DialogueEngine.selectChoice(mockTree, "node_greeting", "c_bribe", wealthyHero);
        assert.equal(result.targetNodeId, "node_bribed");
        assert.equal(result.actions.length, 1);
        assert.equal(result.actions[0].type, "TAKE_GOLD");
        assert.equal(result.actions[0].payload, 50);
        assert.equal(result.isEnd, false);
    });

    it("rejects unauthorized choice selection", () => {
        assert.throws(
            () => DialogueEngine.selectChoice(mockTree, "node_greeting", "c_bribe", novicePlayer),
            { message: /Condition for choice 'c_bribe' not satisfied/ }
        );
    });

    it("validates tree graph integrity", () => {
        const integrity = DialogueEngine.validateTreeIntegrity(mockTree);
        assert.equal(integrity.valid, true);
        assert.deepEqual(integrity.errors, []);
    });
});
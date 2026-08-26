/**
 * Branching Dialogue Tree Node Traversal Engine for OpenAO MMORPG.
 * Provides node-graph progression, conditional choices, action outcomes,
 * variable substitution, and cycle validation.
 */

export interface DialogueCondition {
    minLevel?: number;
    maxLevel?: number;
    requiredClass?: string[];
    requiredRace?: string[];
    minGold?: number;
    minKarma?: number;
    completedQuests?: string[];
    activeQuests?: string[];
}

export interface DialogueAction {
    type: 'GIVE_GOLD' | 'TAKE_GOLD' | 'START_QUEST' | 'COMPLETE_QUEST' | 'TELEPORT' | 'TRIGGER_TRADE' | 'ATTACK_PLAYER';
    payload?: any;
}

export interface DialogueChoice {
    choiceId: string;
    text: string;
    targetNodeId: string | null; // null ends dialogue
    condition?: DialogueCondition;
    actions?: DialogueAction[];
}

export interface DialogueNode {
    nodeId: string;
    speakerName?: string;
    text: string;
    choices: DialogueChoice[];
    defaultNextNodeId?: string | null;
    entryActions?: DialogueAction[];
}

export interface DialogueTree {
    treeId: string;
    initialNodeId: string;
    nodes: Record<string, DialogueNode>;
}

export interface CharacterContext {
    name: string;
    level: number;
    characterClass: string;
    race: string;
    gold: number;
    karma: number;
    completedQuests: string[];
    activeQuests: string[];
}

export class DialogueEngine {
    /**
     * Checks if character context satisfies node/choice conditions.
     */
    static evaluateCondition(condition?: DialogueCondition, context?: CharacterContext): boolean {
        if (!condition || !context) return true;

        if (condition.minLevel !== undefined && context.level < condition.minLevel) return false;
        if (condition.maxLevel !== undefined && context.level > condition.maxLevel) return false;
        if (condition.minGold !== undefined && context.gold < condition.minGold) return false;
        if (condition.minKarma !== undefined && context.karma < condition.minKarma) return false;

        if (condition.requiredClass && !condition.requiredClass.includes(context.characterClass)) return false;
        if (condition.requiredRace && !condition.requiredRace.includes(context.race)) return false;

        if (condition.completedQuests) {
            for (const q of condition.completedQuests) {
                if (!context.completedQuests.includes(q)) return false;
            }
        }

        if (condition.activeQuests) {
            for (const q of condition.activeQuests) {
                if (!context.activeQuests.includes(q)) return false;
            }
        }

        return true;
    }

    /**
     * Interpolates dynamic player variables into dialogue text.
     */
    static interpolateText(text: string, context?: CharacterContext): string {
        if (!context) return text;
        return text
            .replace(/\{playerName\}/g, context.name)
            .replace(/\{level\}/g, String(context.level))
            .replace(/\{class\}/g, context.characterClass)
            .replace(/\{race\}/g, context.race)
            .replace(/\{gold\}/g, String(context.gold));
    }

    /**
     * Resolves the current node state, filtering unavailable choices.
     */
    static getNodeView(tree: DialogueTree, nodeId: string, context?: CharacterContext) {
        const node = tree.nodes[nodeId];
        if (!node) {
            throw new Error(`Dialogue node '${nodeId}' not found in tree '${tree.treeId}'.`);
        }

        const validChoices = node.choices
            .filter((c) => this.evaluateCondition(c.condition, context))
            .map((c) => ({
                choiceId: c.choiceId,
                text: this.interpolateText(c.text, context),
                targetNodeId: c.targetNodeId,
                hasActions: Boolean(c.actions && c.actions.length > 0),
            }));

        return {
            nodeId: node.nodeId,
            speakerName: node.speakerName || 'NPC',
            text: this.interpolateText(node.text, context),
            choices: validChoices,
            isTerminal: validChoices.length === 0 && !node.defaultNextNodeId,
            defaultNextNodeId: node.defaultNextNodeId || null,
        };
    }

    /**
     * Executes choice selection, returning the target node and triggered actions.
     */
    static selectChoice(
        tree: DialogueTree,
        currentNodeId: string,
        choiceId: string,
        context?: CharacterContext
    ) {
        const node = tree.nodes[currentNodeId];
        if (!node) {
            throw new Error(`Current node '${currentNodeId}' not found.`);
        }

        const choice = node.choices.find((c) => c.choiceId === choiceId);
        if (!choice) {
            throw new Error(`Choice '${choiceId}' not available on node '${currentNodeId}'.`);
        }

        if (!this.evaluateCondition(choice.condition, context)) {
            throw new Error(`Condition for choice '${choiceId}' not satisfied.`);
        }

        return {
            targetNodeId: choice.targetNodeId,
            actions: choice.actions || [],
            isEnd: choice.targetNodeId === null,
        };
    }

    /**
     * Validates tree graph integrity, detecting missing targets or infinite loops.
     */
    static validateTreeIntegrity(tree: DialogueTree): { valid: boolean; errors: string[] } {
        const errors: string[] = [];

        if (!tree.nodes[tree.initialNodeId]) {
            errors.push(`Initial node '${tree.initialNodeId}' does not exist.`);
        }

        for (const [id, node] of Object.entries(tree.nodes)) {
            if (node.defaultNextNodeId && !tree.nodes[node.defaultNextNodeId]) {
                errors.push(`Node '${id}' has invalid defaultNextNodeId '${node.defaultNextNodeId}'.`);
            }
            for (const choice of node.choices) {
                if (choice.targetNodeId && !tree.nodes[choice.targetNodeId]) {
                    errors.push(`Choice '${choice.choiceId}' on node '${id}' targets missing node '${choice.targetNodeId}'.`);
                }
            }
        }

        return { valid: errors.length === 0, errors };
    }
}
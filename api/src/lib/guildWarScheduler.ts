/**
 * Weekly Guild War & Territory Control Siege Scheduler for OpenAO MMORPG.
 * Manages active siege windows, capture point scoring accumulation over time,
 * and weekly territory ownership resolution.
 */

export interface SiegeWindow {
    dayOfWeek: number; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    startHour: number; // 0 to 23
    endHour: number;   // 0 to 23
}

export interface TerritoryState {
    territoryId: string;
    controllingGuildId: string | null;
    siegeWindow: SiegeWindow;
    isSiegeActive: boolean;
    // Map of GuildID -> Accumulated War Score
    currentWarScores: Map<string, number>;
    // Current guild holding the central capture point (if any)
    capturePointHolderGuildId: string | null;
}

export class GuildWarScheduler {
    private static readonly SCORE_PER_TICK = 10;

    /**
     * Determines if a given UTC Date falls within the configured Siege Window.
     */
    public static isTimeInSiegeWindow(currentDate: Date, window: SiegeWindow): boolean {
        const currentDay = currentDate.getUTCDay();
        const currentHour = currentDate.getUTCHours();
        
        return currentDay === window.dayOfWeek && 
               currentHour >= window.startHour && 
               currentHour < window.endHour;
    }

    /**
     * Executes the server tick for territory control, accumulating points and resolving wars.
     */
    public static tickTerritory(territory: TerritoryState, currentDate: Date): void {
        const currentlyInWindow = this.isTimeInSiegeWindow(currentDate, territory.siegeWindow);

        // 1. Transition into Siege Mode
        if (currentlyInWindow && !territory.isSiegeActive) {
            territory.isSiegeActive = true;
            territory.currentWarScores.clear(); // Reset scores for the new war
            territory.capturePointHolderGuildId = null;
        }

        // 2. Accumulate Scores if Siege is Active
        if (territory.isSiegeActive && currentlyInWindow) {
            if (territory.capturePointHolderGuildId) {
                const guild = territory.capturePointHolderGuildId;
                const currentScore = territory.currentWarScores.get(guild) || 0;
                territory.currentWarScores.set(guild, currentScore + this.SCORE_PER_TICK);
            }
        }

        // 3. Resolve Siege if time has expired
        if (territory.isSiegeActive && !currentlyInWindow) {
            territory.isSiegeActive = false;
            
            let highestScore = -1;
            let winningGuildId: string | null = null;

            for (const [guildId, score] of territory.currentWarScores.entries()) {
                if (score > highestScore) {
                    highestScore = score;
                    winningGuildId = guildId;
                }
            }

            // If someone scored points, transfer ownership. Otherwise, defenders keep it.
            if (winningGuildId !== null && highestScore > 0) {
                territory.controllingGuildId = winningGuildId;
            }

            territory.currentWarScores.clear();
            territory.capturePointHolderGuildId = null;
        }
    }
}
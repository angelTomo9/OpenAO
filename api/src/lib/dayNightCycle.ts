/**
 * Day-Night Ambient Lighting & Lunar Cycle Engine for OpenAO MMORPG.
 * Computes solar progression, RGB color grading curves, and lunar phases.
 */

export type TimeOfDayPhase = "DAWN" | "DAY" | "DUSK" | "NIGHT";

export type LunarPhase =
    | "NEW_MOON"
    | "WAXING_CRESCENT"
    | "FIRST_QUARTER"
    | "WAXING_GIBBOUS"
    | "FULL_MOON"
    | "WANING_GIBBOUS"
    | "LAST_QUARTER"
    | "WANING_CRESCENT";

export interface RGBColor {
    r: number; // 0.0 to 1.0
    g: number;
    b: number;
}

export interface DayNightState {
    tickInDay: number;
    gameHour: number;
    gameMinute: number;
    phase: TimeOfDayPhase;
    ambientColor: RGBColor;
    ambientIntensity: number; // 0.0 to 1.0
    lunarPhase: LunarPhase;
    lunarLightBonus: number; // 0.0 to 0.25 (full moon provides night vision boost)
    isIndoors: boolean;
}

export class DayNightCycleEngine {
    public static readonly TICKS_PER_DAY = 14400; // 12 real minutes per game day at 20 ticks/sec
    public static readonly DAYS_PER_LUNAR_CYCLE = 8;

    // Color keyframes in 24-hour game clock
    private static readonly COLOR_MIDNIGHT: RGBColor = { r: 0.08, g: 0.10, b: 0.22 };
    private static readonly COLOR_DAWN: RGBColor = { r: 0.95, g: 0.60, b: 0.40 };
    private static readonly COLOR_NOON: RGBColor = { r: 1.00, g: 1.00, b: 1.00 };
    private static readonly COLOR_DUSK: RGBColor = { r: 0.90, g: 0.45, b: 0.25 };

    private static lerp(a: number, b: number, t: number): number {
        return a + (b - a) * t;
    }

    private static lerpColor(c1: RGBColor, c2: RGBColor, t: number): RGBColor {
        // Smoothstep interpolation
        const smoothT = t * t * (3 - 2 * t);
        return {
            r: this.lerp(c1.r, c2.r, smoothT),
            g: this.lerp(c1.g, c2.g, smoothT),
            b: this.lerp(c1.b, c2.b, smoothT),
        };
    }

    public static getLunarPhase(dayNumber: number): { phase: LunarPhase; bonus: number } {
        const phaseIndex = dayNumber % this.DAYS_PER_LUNAR_CYCLE;
        const phases: LunarPhase[] = [
            "NEW_MOON",
            "WAXING_CRESCENT",
            "FIRST_QUARTER",
            "WAXING_GIBBOUS",
            "FULL_MOON",
            "WANING_GIBBOUS",
            "LAST_QUARTER",
            "WANING_CRESCENT",
        ];

        const bonuses = [0.0, 0.05, 0.10, 0.18, 0.25, 0.18, 0.10, 0.05];
        return {
            phase: phases[phaseIndex],
            bonus: bonuses[phaseIndex],
        };
    }

    public static calculateState(
        serverTick: number,
        isDungeonOrIndoors = false
    ): DayNightState {
        if (isDungeonOrIndoors) {
            return {
                tickInDay: 0,
                gameHour: 12,
                gameMinute: 0,
                phase: "NIGHT",
                ambientColor: { r: 0.15, g: 0.15, b: 0.18 },
                ambientIntensity: 0.25,
                lunarPhase: "NEW_MOON",
                lunarLightBonus: 0,
                isIndoors: true,
            };
        }

        const totalDayNumber = Math.floor(serverTick / this.TICKS_PER_DAY);
        const tickInDay = serverTick % this.TICKS_PER_DAY;
        const normalizedTime = tickInDay / this.TICKS_PER_DAY; // 0.0 to 1.0

        const totalMinutesInDay = normalizedTime * 1440;
        const gameHour = Math.floor(totalMinutesInDay / 60);
        const gameMinute = Math.floor(totalMinutesInDay % 60);

        const { phase: lunarPhase, bonus: lunarBonus } = this.getLunarPhase(totalDayNumber);

        let phase: TimeOfDayPhase = "DAY";
        let color: RGBColor = this.COLOR_NOON;
        let intensity = 1.0;

        // 24-hour cycle division:
        // 00:00 - 05:00 : Midnight / Deep Night
        // 05:00 - 08:00 : Dawn transition
        // 08:00 - 18:00 : Full Daylight
        // 18:00 - 21:00 : Dusk transition
        // 21:00 - 24:00 : Night transition to Midnight
        const hourFloat = gameHour + gameMinute / 60;

        if (hourFloat < 5.0) {
            phase = "NIGHT";
            color = this.COLOR_MIDNIGHT;
            intensity = 0.15 + lunarBonus;
        } else if (hourFloat >= 5.0 && hourFloat < 8.0) {
            phase = "DAWN";
            const t = (hourFloat - 5.0) / 3.0;
            color = this.lerpColor(this.COLOR_MIDNIGHT, this.COLOR_DAWN, t);
            intensity = this.lerp(0.15 + lunarBonus, 0.85, t);
        } else if (hourFloat >= 8.0 && hourFloat < 18.0) {
            phase = "DAY";
            const t = Math.sin(((hourFloat - 8.0) / 10.0) * Math.PI);
            color = this.lerpColor(this.COLOR_DAWN, this.COLOR_NOON, t);
            intensity = 1.0;
        } else if (hourFloat >= 18.0 && hourFloat < 21.0) {
            phase = "DUSK";
            const t = (hourFloat - 18.0) / 3.0;
            color = this.lerpColor(this.COLOR_NOON, this.COLOR_DUSK, t);
            intensity = this.lerp(1.0, 0.45, t);
        } else {
            phase = "NIGHT";
            const t = (hourFloat - 21.0) / 3.0;
            color = this.lerpColor(this.COLOR_DUSK, this.COLOR_MIDNIGHT, t);
            intensity = this.lerp(0.45, 0.15 + lunarBonus, t);
        }

        return {
            tickInDay,
            gameHour,
            gameMinute,
            phase,
            ambientColor: color,
            ambientIntensity: Math.min(1.0, intensity),
            lunarPhase,
            lunarLightBonus: lunarBonus,
            isIndoors: false,
        };
    }
}
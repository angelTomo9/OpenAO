/**
 * Area of Effect (AoE) Spatial Target Boundary & Raycast Selector for OpenAO MMORPG.
 * Computes circular, sector/cone, ring/donut, and beam AoE zones with line-of-sight wall occlusion.
 */

export type AoEShape = "CIRCLE" | "CONE_SECTOR" | "RING_DONUT" | "LINE_BEAM";
export type TargetFilter = "ALL" | "HOSTILE_ONLY" | "FRIENDLY_ONLY" | "ALL_EXCEPT_SELF";

export interface Point2D {
    x: number;
    y: number;
}

export interface TargetEntity {
    id: string;
    x: number;
    y: number;
    teamId: number;
    isAlive: boolean;
}

export interface AoEShapeDefinition {
    shape: AoEShape;
    origin: Point2D;
    radius: number; // For circle, cone, ring
    innerRadius?: number; // For ring/donut
    directionAngleRad?: number; // For cone and beam (radians)
    coneAngleRad?: number; // For cone/sector
    beamWidth?: number; // For line/beam
    beamLength?: number; // For line/beam
}

export interface AoESelectorOptions {
    shape: AoEShapeDefinition;
    casterId: string;
    casterTeamId: number;
    filter: TargetFilter;
    wallCollisionMap?: boolean[][]; // [y][x] true if solid wall blocking LOS
}

export class AoETargetSelector {
    /**
     * Bresenham Line-of-Sight check between origin and target point.
     */
    public static hasLineOfSight(
        p0: Point2D,
        p1: Point2D,
        collisionMap?: boolean[][]
    ): boolean {
        if (!collisionMap || collisionMap.length === 0) return true;

        let x0 = Math.floor(p0.x);
        let y0 = Math.floor(p0.y);
        const x1 = Math.floor(p1.x);
        const y1 = Math.floor(p1.y);

        const dx = Math.abs(x1 - x0);
        const dy = Math.abs(y1 - y0);
        const sx = x0 < x1 ? 1 : -1;
        const sy = y0 < y1 ? 1 : -1;
        let err = dx - dy;

        while (x0 !== x1 || y0 !== y1) {
            // Ignore wall at origin, but check all intermediate points
            if (x0 !== Math.floor(p0.x) || y0 !== Math.floor(p0.y)) {
                if (collisionMap[y0] && collisionMap[y0][x0]) {
                    return false; // Obstructed by wall
                }
            }

            const e2 = 2 * err;
            if (e2 > -dy) {
                err -= dy;
                x0 += sx;
            }
            if (e2 < dx) {
                err += dx;
                y0 += sy;
            }
        }

        return true;
    }

    /**
     * Determines if a point falls within the geometric bounds of the AoE shape.
     */
    public static isPointInsideShape(point: Point2D, shape: AoEShapeDefinition): boolean {
        const dx = point.x - shape.origin.x;
        const dy = point.y - shape.origin.y;
        const distSq = dx * dx + dy * dy;
        const dist = Math.sqrt(distSq);

        switch (shape.shape) {
            case "CIRCLE":
                return dist <= shape.radius;

            case "RING_DONUT": {
                const inner = shape.innerRadius ?? 0;
                return dist >= inner && dist <= shape.radius;
            }

            case "CONE_SECTOR": {
                if (dist > shape.radius) return false;
                if (dist === 0) return true;

                const angleToTarget = Math.atan2(dy, dx);
                const dir = shape.directionAngleRad ?? 0;
                const halfCone = (shape.coneAngleRad ?? Math.PI / 3) / 2;

                // Normalize angular difference to [-PI, PI]
                let diff = angleToTarget - dir;
                while (diff < -Math.PI) diff += 2 * Math.PI;
                while (diff > Math.PI) diff -= 2 * Math.PI;

                return Math.abs(diff) <= halfCone;
            }

            case "LINE_BEAM": {
                const length = shape.beamLength ?? shape.radius;
                const width = shape.beamWidth ?? 1.0;
                const dir = shape.directionAngleRad ?? 0;

                // Project target relative to beam direction
                const cos = Math.cos(-dir);
                const sin = Math.sin(-dir);
                const localX = dx * cos - dy * sin;
                const localY = dx * sin + dy * cos;

                return (
                    localX >= 0 &&
                    localX <= length &&
                    Math.abs(localY) <= width / 2
                );
            }
        }
    }

    /**
     * Selects all valid targets matching the AoE geometry, team filters, and line of sight.
     */
    public static selectTargets(
        entities: TargetEntity[],
        options: AoESelectorOptions
    ): TargetEntity[] {
        return entities.filter((entity) => {
            if (!entity.isAlive) return false;

            // 1. Team & Caster Filters
            switch (options.filter) {
                case "ALL_EXCEPT_SELF":
                    if (entity.id === options.casterId) return false;
                    break;
                case "HOSTILE_ONLY":
                    if (entity.teamId === options.casterTeamId) return false;
                    break;
                case "FRIENDLY_ONLY":
                    if (entity.teamId !== options.casterTeamId) return false;
                    break;
                case "ALL":
                default:
                    break;
            }

            // 2. Geometric Shape Boundary Check
            if (!this.isPointInsideShape(entity, options.shape)) {
                return false;
            }

            // 3. Line of Sight Check
            if (!this.hasLineOfSight(options.shape.origin, entity, options.wallCollisionMap)) {
                return false;
            }

            return true;
        });
    }
}
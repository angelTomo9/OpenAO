/**
 * Spatial Quadtree Data Structure for OpenAO MMORPG.
 * Drastically optimizes 2D collision detection and Area of Effect (AoE) resolutions
 * by partitioning the world space and reducing query time complexity from O(n^2) to O(n log n).
 */

export interface Point2D {
    x: number;
    y: number;
}

export interface SpatialEntity extends Point2D {
    entityId: string;
}

export class AABB {
    // Represents an Axis-Aligned Bounding Box using center (x, y) and half-dimension (w, h)
    constructor(
        public centerX: number,
        public centerY: number,
        public halfWidth: number,
        public halfHeight: number
    ) {}

    public containsPoint(p: Point2D): boolean {
        return (
            p.x >= this.centerX - this.halfWidth &&
            p.x <= this.centerX + this.halfWidth &&
            p.y >= this.centerY - this.halfHeight &&
            p.y <= this.centerY + this.halfHeight
        );
    }

    public intersectsAABB(other: AABB): boolean {
        return !(
            other.centerX - other.halfWidth > this.centerX + this.halfWidth ||
            other.centerX + other.halfWidth < this.centerX - this.halfWidth ||
            other.centerY - other.halfHeight > this.centerY + this.halfHeight ||
            other.centerY + other.halfHeight < this.centerY - this.halfHeight
        );
    }
}

export class Quadtree {
    private static readonly CAPACITY = 4; // Max entities before subdivision

    private entities: SpatialEntity[] = [];
    private divided = false;
    
    private northWest: Quadtree | null = null;
    private northEast: Quadtree | null = null;
    private southWest: Quadtree | null = null;
    private southEast: Quadtree | null = null;

    constructor(public boundary: AABB) {}

    private subdivide(): void {
        const x = this.boundary.centerX;
        const y = this.boundary.centerY;
        const w = this.boundary.halfWidth;
        const h = this.boundary.halfHeight;

        this.northWest = new Quadtree(new AABB(x - w / 2, y + h / 2, w / 2, h / 2));
        this.northEast = new Quadtree(new AABB(x + w / 2, y + h / 2, w / 2, h / 2));
        this.southWest = new Quadtree(new AABB(x - w / 2, y - h / 2, w / 2, h / 2));
        this.southEast = new Quadtree(new AABB(x + w / 2, y - h / 2, w / 2, h / 2));

        this.divided = true;
    }

    public insert(entity: SpatialEntity): boolean {
        if (!this.boundary.containsPoint(entity)) {
            return false;
        }

        if (this.entities.length < Quadtree.CAPACITY) {
            this.entities.push(entity);
            return true;
        }

        if (!this.divided) {
            this.subdivide();
        }

        if (this.northWest!.insert(entity)) return true;
        if (this.northEast!.insert(entity)) return true;
        if (this.southWest!.insert(entity)) return true;
        if (this.southEast!.insert(entity)) return true;

        return false;
    }

    public queryRange(range: AABB, found: SpatialEntity[] = []): SpatialEntity[] {
        if (!this.boundary.intersectsAABB(range)) {
            return found; // Empty intersection
        }

        for (const entity of this.entities) {
            if (range.containsPoint(entity)) {
                found.push(entity);
            }
        }

        if (this.divided) {
            this.northWest!.queryRange(range, found);
            this.northEast!.queryRange(range, found);
            this.southWest!.queryRange(range, found);
            this.southEast!.queryRange(range, found);
        }

        return found;
    }
}
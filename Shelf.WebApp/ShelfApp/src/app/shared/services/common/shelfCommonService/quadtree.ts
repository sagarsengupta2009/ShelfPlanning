import { AppConstantSpace } from 'src/app/shared/constants';
import { Coordinates2 } from 'src/app/shared/models';

// These models represent the minimum fields needed for the quardtree data structure to work.
// Not exporting, as these types are used with in this file only

// Where we are inserting. (x, y, height, width )
interface QuadBoundary {
    x: number;
    y: number;
    height: number;
    width: number;
}
// What we are inserting
interface QuadtreeEntry extends QuadBoundary {
    id: string;
}

/**
 * This is the type safe version of quadtree.service.ts
 * Quadtree algorithm implementation
 *  Reference:
 *  https://chidiwilliams.com/post/quadtrees/
 *  https://en.wikipedia.org/wiki/Quadtree
*/
export class Quadtree<T extends QuadtreeEntry> {

    private _allChildren: T[] = [];
    private _root: BoundaryNode<T> = null;

    public get allQuardChildren(): T[] { return this._allChildren; }
    public get root(): BoundaryNode<T> { return this._root; }

    constructor(
        private readonly boundary: QuadBoundary,
        private readonly maxDepth: number = 4, // tree depth
        private readonly maxChildren: number = 4, // node capacity
    ) {
        this._root = new BoundaryNode(this.boundary, 0, this.maxDepth, this.maxChildren);
    }

    public insertToTree(bounds: T[]): void {
        if (!bounds?.length) { return; }

        this._allChildren = bounds;

        for (let boundary of bounds) {
            this._root.insert(boundary);
        }
    }
    public clear() {
        this._root.clear();
    }

    public retrieve(item: QuadBoundary): T[] {
        const output = []; // array to collect objects recursively
        let out = this.root.retrieve(item, output);//.slice(0);// slice() will give a copy
        //const uniqe = out.filter((n, i) => out.indexOf(n) === i);
        return Array.from(new Set(out));
    }
}

/**
 * Represents the index at which the quad of that position stored.
 * eg: Top_Left = 0 means, the node[0] represents the top-left quadrant
 */
enum NodePosition {
    TOP_LEFT = 0,
    TOP_RIGHT = 1,
    BOTTOM_LEFT = 2,
    BOTTOM_RIGHT = 3,
}

// To export to other files. without exposing the implementation details
export interface QuadtreeNode<T extends QuadtreeEntry> {
    getBoundary(): QuadBoundary;
    getIntersectingChildren(): T[];
    getChildren(): T[];
    getNodes(): QuadtreeNode<T>[];
}

class BoundaryNode<T extends QuadtreeEntry> implements QuadtreeNode<T> {

    private nodes: BoundaryNode<T>[] = [];

    private children: T[] = [];
    private intersectingChildren: T[] = [];

    public getBoundary(): QuadBoundary { return this.boundary; }
    public getIntersectingChildren(): T[] { return this.intersectingChildren; }
    public getChildren(): T[] { return this.children; }
    public getNodes(): BoundaryNode<T>[] { return this.nodes; }

    constructor(
        private readonly boundary: QuadBoundary, // Current node bounday
        private depth: number = 0, // the tree depth at which this node is.
        private maxDepth: number = 4, // tree depth
        private maxChildren: number = 4, // node capacity
    ) { }

    public insert(item: T): void {
        if (this.nodes.length) {
            // Find position of (x, y) coordinate of the boundary (botton-left point)
            const position: NodePosition = this.findPosition(item);
            const quadBounds: QuadBoundary = this.nodes[position].boundary;

            // Note : Not adding coffine case item inside the nodes for selection issue in DEVOPS 215566. In futute we need to find more suitable solution for this issue.
            // Also can not apply specfic data type cause using generic data type T.
            const isCoffineCaseItem = (item as any).parentFixtureType === AppConstantSpace.COFFINCASEOBJ || (item as any).parentFixtureType === AppConstantSpace.BASKETOBJ;
            
            // Is the child can fit within the quadrant boundary?
            if (this.isWithinBoundary(item, quadBounds) && !isCoffineCaseItem) {
                this.nodes[position].insert(item);
            } else {
                this.intersectingChildren.push(item);
            }
            return;
        }

        this.children.push(item);

        // Once we reach maxDepth, all childreen then we are in leaf node
        if (this.depth < this.maxDepth
            && this.children.length > this.maxChildren) {

            this.subdivide();

            for (let child of this.children) {
                this.insert(child);
            }
            // clean current entries, we have divided this quadrant
            this.children.length = 0;
        }
    }

    private isWithinBoundary(rect: QuadBoundary, boundary: QuadBoundary) {
        return rect.x >= boundary.x
            && rect.x + rect.width <= boundary.x + boundary.width
            && rect.y >= boundary.y
            && rect.y + rect.height <= boundary.y + boundary.height;
    }

    /** Retrieve entries at this boundary */
    public retrieve(item: QuadBoundary, out: T[]): T[] {
        if (this.nodes.length) {
            const index = this.findPosition(item);
            const node = this.nodes[index];

            if (this.isWithinBoundary(item, node.boundary)) {
                out.push.apply(out, this.nodes[index].retrieve(item, out));
            } else {
                //Part of the item are overlapping multiple child nodes. For each of the overlapping nodes, return all containing objects.
                if (item.x <= this.nodes[NodePosition.TOP_RIGHT].boundary.x) {
                    if (item.y <= this.nodes[NodePosition.BOTTOM_LEFT].boundary.y) {
                        out.push.apply(out, this.nodes[NodePosition.TOP_LEFT].getAllContent(out));
                    }

                    if (item.y + item.height > this.nodes[NodePosition.BOTTOM_LEFT].boundary.y) {
                        out.push.apply(out, this.nodes[NodePosition.BOTTOM_LEFT].getAllContent(out));
                    }
                }

                if (item.x + item.width > this.nodes[NodePosition.TOP_RIGHT].boundary.x) {
                    if (item.y <= this.nodes[NodePosition.BOTTOM_RIGHT].boundary.y) {
                        out.push.apply(out, this.nodes[NodePosition.TOP_RIGHT].getAllContent(out));
                    }

                    if (item.y + item.height > this.nodes[NodePosition.BOTTOM_RIGHT].boundary.y) {
                        out.push.apply(out, this.nodes[NodePosition.BOTTOM_RIGHT].getAllContent(out));
                    }
                }
            }
        }

        out.push.apply(out, this.intersectingChildren);
        out.push.apply(out, this.children);

        return out;
    }

    private getAllContent(out: T[]): T[] {

        if (this.nodes.length) {
            for (let i = 0; i < this.nodes.length; i++) {
                this.nodes[i].getAllContent(out);
            }
        }
        out.push.apply(out, this.intersectingChildren);
        out.push.apply(out, this.children);
        return out;
    };

    /** Find position of (x, y) coordinate of the boundary (botton-left point) */
    private findPosition(point: Coordinates2): NodePosition {
        // Find the relative position of new boundary with respect to the
        const xMid = this.boundary.x + (this.boundary.width / 2);
        const yMid = this.boundary.y + (this.boundary.height / 2);
        const left: boolean = point.x <= xMid;
        const top: boolean = point.y <= yMid;

        //top left
        let position = NodePosition.TOP_LEFT;
        if (left) {
            //left side
            if (!top) {
                //bottom left
                position = NodePosition.BOTTOM_LEFT;
            }
        } else {
            //right side
            if (top) {
                //top right
                position = NodePosition.TOP_RIGHT;
            } else {
                //bottom right
                position = NodePosition.BOTTOM_RIGHT;
            }
        }
        return position;
    }

    private subdivide(): void {
        const depth = this.depth + 1;

        const bx = this.boundary.x;
        const by = this.boundary.y;

        //floor the values
        const b_w_h = (this.boundary.width / 2);
        const b_h_h = (this.boundary.height / 2);
        const bx_b_w_h = bx + b_w_h;
        const by_b_h_h = by + b_h_h;

        //top left
        const topLeftBoundary: QuadBoundary = {
            x: bx,
            y: by,
            width: b_w_h,
            height: b_h_h
        };
        this.nodes[NodePosition.TOP_LEFT] = new BoundaryNode(topLeftBoundary, depth, this.maxDepth, this.maxChildren);

        //top right
        const topRightBoundary: QuadBoundary = {
            x: bx_b_w_h,
            y: by,
            width: b_w_h,
            height: b_h_h
        };
        this.nodes[NodePosition.TOP_RIGHT] = new BoundaryNode(topRightBoundary, depth, this.maxDepth, this.maxChildren);

        //bottom left
        const bottomLeftBoundary: QuadBoundary = {
            x: bx,
            y: by_b_h_h,
            width: b_w_h,
            height: b_h_h
        };
        this.nodes[NodePosition.BOTTOM_LEFT] = new BoundaryNode(bottomLeftBoundary,
            depth, this.maxDepth, this.maxChildren);

        //bottom right
        const bottomRightBoundary: QuadBoundary = {
            x: bx_b_w_h,
            y: by_b_h_h,
            width: b_w_h,
            height: b_h_h
        };
        this.nodes[NodePosition.BOTTOM_RIGHT] = new BoundaryNode(bottomRightBoundary,
            depth, this.maxDepth, this.maxChildren);
    }

    public clear(): void {
        this.intersectingChildren.length = 0;
        this.children.length = 0;

        if (!this.nodes.length) { return; }
        for (let item of this.nodes) { item.clear(); }

        this.nodes.length = 0;
    }

}
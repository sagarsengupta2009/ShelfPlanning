import { Injectable } from '@angular/core';
import { Position, StandardShelf } from 'src/app/shared/classes';
import { Utils } from 'src/app/shared/constants';
import { RectangleCoordinates2d, PositionXYCords, PogObjectCoordinates } from 'src/app/shared/models';

@Injectable({
    providedIn: 'root'
})
export class CollisionService {

    public doSlopedShelvesCollide(shelf1: Bound | StandardShelf, shelf2: Bound | StandardShelf, FITTOLERANCE?: number): boolean {
        const shelf2Poly = (shelf: StandardShelf): { x: number; y: number; }[] => {
            let recWidth = shelf.Dimension.Depth;
            let recHeight = shelf.Fixture.Thickness + shelf.minMerchHeight;
            let recSlope = Math.abs(shelf.Rotation.X);
            let recCos = Math.cos((recSlope * Math.PI) / 180);
            let recSin = Math.sin((recSlope * Math.PI) / 180);
            let P1X = shelf.Location.Z;
            let P1Y = shelf.Location.Y;
            let P2X = P1X - recSin * recHeight;
            let P2Y = P1Y + recCos * recHeight;
            let P3X = P2X + recCos * recWidth;
            let P3Y = P2Y - recSin * recWidth;
            let P4X = P1X + recCos * recWidth;
            let P4Y = P1Y - recSin * recWidth;
            return [
                { x: P1X, y: P1Y },
                { x: P2X, y: P2Y },
                { x: P3X, y: P3Y },
                { x: P4X, y: P4Y },
            ];
        };
        const quadPoints = (bounds: Bound, tolerance: number = 0) => {
            let recWidth = bounds.depth;
            let recHeight = bounds.height;
            let recSlope = bounds.rotationx; //-bounds.rotationx; //
            let recCos = Math.cos((recSlope * Math.PI) / 180);
            let recSin = Math.sin((recSlope * Math.PI) / 180);
            let P1X = bounds.z; //+(bounds.z * (1-tolerance));
            let P1Y = bounds.backtop - tolerance;
            //Z - H * sin(slope), Y - H * cos(slope)
            let P2X = P1X - recSin * recHeight; //+(recSin * recHeight * (1-tolerance)));
            let P2Y = P1Y - recCos * recHeight - tolerance;
            //Z + D * cos(slope) - H * sin(slope), Y - D * sin(slope) - H * cos(slope)

            let P3X = P2X + recCos * recWidth - tolerance;
            let P3Y = P2Y - recSin * recWidth - tolerance;

            let P4X = P1X + recCos * recWidth - tolerance;
            let P4Y = P1Y - recSin * recWidth - tolerance;

            return [
                { x: P1X, y: P1Y },
                { x: P2X, y: P2Y },
                { x: P3X, y: P3Y },
                { x: P4X, y: P4Y },
            ];
        };
        const pointsa = 'Dimension' in shelf1 ? shelf2Poly(shelf1) : quadPoints(shelf1, FITTOLERANCE);
        const pointsb = 'Dimension' in shelf2 ? shelf2Poly(shelf2) : quadPoints(shelf2, FITTOLERANCE);
        return this.doPolygonsIntersect(pointsa, pointsb);
    }

    public isPositionIntersectingWithXYCoordsForPaste(pos: Position, positionXYCords: PositionXYCords, targetParentItemData): boolean  {

        let rect1: RectangleCoordinates2d = {
            xstart: positionXYCords.X1,
            xend: positionXYCords.X2,
            ystart: positionXYCords.Y1,
            yend: positionXYCords.Y2,
        };

        let posXYCords: PositionXYCords;
        if (Utils.checkIfPegType(targetParentItemData)) {
            let posLeft = pos.getPegInfo()?.Type && pos.pegOffsetX ? pos.Location.X : pos.Location.X + pos.getPegInfo()?.OffsetX
            let posTop = pos.Location.Y + pos.Dimension.Height;
            posXYCords = targetParentItemData.findXYConsideringPegType(pos, { left: posLeft, top: posTop });
        }

        const rect2: RectangleCoordinates2d = {
            xstart: posXYCords.X1,
            xend: posXYCords.X2,
            ystart: posXYCords.Y1,
            yend: posXYCords.Y2,
        };
        
        if (rect1.ystart == rect1.yend && rect2.ystart == rect2.yend) {
            return !(
                rect1.xstart > rect2.xend ||
                rect1.xend < rect2.xstart ||
                rect1.yend < rect2.ystart ||
                rect1.ystart > rect2.yend
            );
        } else {
            return this.isIntersecting2D(rect1, rect2, 0);
        }
    }

    public isPositionIntersectingWithXYCoords(pos: Position, positionXYCords: PositionXYCords): boolean  {

        let rect1: RectangleCoordinates2d = {
            xstart: positionXYCords.X1,
            xend: positionXYCords.X2,
            ystart: positionXYCords.Y1,
            yend: positionXYCords.Y2,
        };

        const rect2: RectangleCoordinates2d = {
            xstart: pos.Location.X,
            xend: pos.Location.X + pos.linearWidth(),
            ystart: pos.Location.Y,
            yend: pos.Location.Y + pos.linearHeight(),
        };
        return this.isIntersecting2D(rect1, rect2, 0);
    }

    // TODO: @maly is this name apt? isRectanglesIntercepting
    public isIntersecting2D(rect1: RectangleCoordinates2d, rect2: RectangleCoordinates2d, fitTolerance: number) {
        return !(
            rect1.xstart >= rect2.xend - fitTolerance ||
            rect1.xend - fitTolerance <= rect2.xstart ||
            rect1.yend - fitTolerance <= rect2.ystart ||
            rect1.ystart >= rect2.yend - fitTolerance
        );
    }

    // TODO: what is the type of quad2?
    // TODO: PoObjectBoundary can be used for  quad1?, quad2? params?
    // TODO: make the params mandatory and remove the first if block
    // TODO: @malu understand rubberband-support.directive.ts remove the reference from there
    public checkIfRectIntersect(rect1: PogObjectCoordinates, rect2: PogObjectCoordinates, fitTolerance: number, quad1?, quad2?): boolean {
        // TODO: @narendra why is this code retained?
        //if (this.doPolygonsIntersect([{ x: rect1.xstart, y: rect1.ystart }], [{ x: rect2.xstart, y: rect2.ystart }]) || this.doPolygonsIntersect([{ x: rect1.xstart, y: rect1.ystart }], [{ x: rect2.xstart, y: rect2.ystart }])) {
        //    if (this.doPolygonsIntersect([{ x: rect1.xstart, y: rect1.ystart }], [{ x: rect2.xstart, y: rect2.ystart }])) {
        //        return true;
        //    }else return false;
        //}
        //return false;

        if (!quad1) {
            // only x1, x2, y1, y2 needs to be compared.
            return this.isIntersecting2D(rect1, rect2, fitTolerance);
        } // else quad1 not empty

        if (
            !(
                (rect1.xstart >= rect2.xend - fitTolerance ||
                    rect1.xend - fitTolerance <= rect2.xstart ||
                    rect1.yend - fitTolerance <= rect2.ystart ||
                    rect1.ystart >= rect2.yend - fitTolerance) &&
                (rect1.xstart >= rect2.xend - fitTolerance ||
                    rect1.xend - fitTolerance <= rect2.xstart ||
                    rect1.yselend - fitTolerance <= rect2.yselstart ||
                    rect1.yselstart >= rect2.yselend - fitTolerance) &&
                (rect1.xstart >= rect2.xend - fitTolerance ||
                    rect1.xend - fitTolerance <= rect2.xstart ||
                    rect1.yselend - fitTolerance <= rect2.ystart ||
                    rect1.yselstart >= rect2.yend - fitTolerance) &&
                (rect1.xstart >= rect2.xend - fitTolerance ||
                    rect1.xend - fitTolerance <= rect2.xstart ||
                    rect1.yend - fitTolerance <= rect2.yselstart ||
                    rect1.ystart >= rect2.yselend - fitTolerance)
            )
        ) {
            if (!(quad1 == undefined && quad2 == undefined)) {
                if (this.doSlopedShelvesCollide(quad1, quad2, fitTolerance)) {
                    return true;
                }
            } else {
                return true;
            }
        }
        return false;
    }

    /*
     * Helper function to determine whether there is an intersection between the two polygons described
     * by the lists of vertices. Uses the Separating Axis Theorem
     *
     * @param a an array of connected points [{x:, y:}, {x:, y:},...] that form a closed polygon
     * @param b an array of connected points [{x:, y:}, {x:, y:},...] that form a closed polygon
     * @return true if there is any intersection between the 2 polygons, false otherwise
     */

    private doPolygonsIntersect(a: { x: number; y: number }[], b: { x: number; y: number }[]): boolean {
        let polygons = [a, b];
        let minA;
        let maxA;
        let projected;
        let i;
        let i1;
        let j;
        let minB;
        let maxB;

        for (i = 0; i < polygons.length; i++) {
            // for each polygon, look at each edge of the polygon, and determine if it separates
            // the two shapes
            let polygon = polygons[i];
            for (i1 = 0; i1 < polygon.length; i1++) {
                // grab 2 vertices to create an edge
                let i2 = (i1 + 1) % polygon.length;
                let p1 = polygon[i1];
                let p2 = polygon[i2];

                // find the line perpendicular to this edge
                let normal = { x: p2.y - p1.y, y: p1.x - p2.x };

                minA = maxA = undefined;
                // for each vertex in the first shape, project it onto the line perpendicular to the edge
                // and keep track of the min and max of these values
                for (j = 0; j < a.length; j++) {
                    projected = normal.x * a[j].x + normal.y * a[j].y;
                    if (minA === undefined || projected < minA) {
                        minA = projected;
                    }
                    if (maxA === undefined || projected > maxA) {
                        maxA = projected;
                    }
                }

                // for each vertex in the second shape, project it onto the line perpendicular to the edge
                // and keep track of the min and max of these values
                minB = maxB = undefined;
                for (j = 0; j < b.length; j++) {
                    projected = normal.x * b[j].x + normal.y * b[j].y;
                    if (minB === undefined || projected < minB) {
                        minB = projected;
                    }
                    if (maxB === undefined || projected > maxB) {
                        maxB = projected;
                    }
                }

                // if there is no overlap between the projects, the edge we are looking at separates the two
                // polygons, and we know there is no overlap
                if (maxA < minB || maxB < minA) {
                    return false;
                }
            }
        }
        return true;
    }


}


interface Bound {
    z: any;
    backtop: number;
    rotationx: any;
    height: any;
    depth: any;

}
import { Injectable } from '@angular/core';
import { ConsoleLogService, LocalStorageService } from 'src/app/framework.module';
import { AppConstantSpace, LocalStorageKeys, Utils } from 'src/app/shared/constants';
import {
  PogObjectBoundary, PogObjectCoordinates, QuadBounds,
  QuardTreeBound, RectangleBoundary, RectangleCoordinates2d,
  QuadChildIntersections,
  BlockDisplayType,
} from 'src/app/shared/models';
import {
  SharedService, PlanogramService, PlanogramStoreService,
  ParentApplicationService, CollisionService
} from 'src/app/shared/services'
import {
  Block, Position, Section
} from 'src/app/shared/classes';
import { FixtureList, ObjectListItem } from '../shared/shared.service';
import { Quadtree, QuadtreeNode } from './quadtree';

const QuardObjectDerivedTypes = [
  AppConstantSpace.STANDARDSHELFOBJ,
  AppConstantSpace.BLOCK_FIXTURE,
  // CoffinTypes
  AppConstantSpace.COFFINCASEOBJ,
  AppConstantSpace.BASKETOBJ,
  // PegTypes
  AppConstantSpace.PEGBOARDOBJ,
  AppConstantSpace.SLOTWALLOBJ,
  AppConstantSpace.CROSSBAROBJ,
];

const AllocateObjectDerivedTypes = [
  ...QuardObjectDerivedTypes,
  AppConstantSpace.BLOCKOBJECT
];

type QuardShelfTypes = FixtureList | Block;

interface QuadtreeDrawParams {
  selectMode: boolean;
  minMerchMode: boolean;
  side: boolean;
}
const defaultDrawParams = {
  selectMode: false,
  minMerchMode: false,
  side: false,
}

@Injectable({
  providedIn: 'root'
})
export class QuadtreeUtilsService {

  // For planogrms ranging from 20 to 1000 products,
  // optimum depth & capacity is 4 and 16
  private qtreeDepth: number = 4;
  private qtreeNodeCapacity: number = 16;

  constructor(
    private readonly sharedService: SharedService,
    private readonly parentApp: ParentApplicationService,
    private readonly collision: CollisionService,
    private readonly planogramService: PlanogramService,
    private readonly planogramStoreService: PlanogramStoreService,
    private readonly log: ConsoleLogService,
    private readonly localStorage: LocalStorageService,
  ) {
    this.setQuadtreeProperties();
  }

  public qtreeObjs: { [key: string]: Quadtree<QuardTreeBound> } = {};

  private getQtree(sectionID: string): Quadtree<QuardTreeBound> {
    return this.qtreeObjs[sectionID];
  }
  private setQtree(sectionID: string, value: Quadtree<QuardTreeBound>): void {
    this.qtreeObjs[sectionID] = value;
  }

  minMerchCheckFixtures: { [key: string]: string[] } = {};

  public createQuadTree(sectionID: string): Quadtree<QuardTreeBound> {
    // if a tree exists for sectionID, delete it.
    const qtree = this.getQtree(sectionID);
    if (qtree) { qtree.clear(); }

    // Find the boundaries and create new quadtree
    const rootObj: Section = this.sharedService.getObject(sectionID, sectionID) as Section;
    const height = rootObj.ChildDimension.Height;
    const width = rootObj.ChildDimension.Width;
    const boundary: RectangleBoundary = { x: 0, y: 0, width, height };
    const newQtree = new Quadtree<QuardTreeBound>(boundary, this.qtreeDepth, this.qtreeNodeCapacity);

    // Find children and insert
    const qtreeChildren = this.getAllQuardChildren(rootObj);
    newQtree.insertToTree(qtreeChildren);

    this.setQtree(sectionID, newQtree);
    // uncomment this line to test the coordinates
    // this.drawQuads(sectionID);
    return newQtree;
  }

  private getAllQuardChildren(rootObject: Section): QuardTreeBound[] {
    let allQuadChildren: (Position | QuardShelfTypes)[] = [];

    // positions
    if (this.planogramService.rootFlags[rootObject.$sectionID]?.blockview != BlockDisplayType.HIDE_POSITIONS) {
      allQuadChildren = rootObject.getAllPositions();
    }

    // shelves
    const objDerivedTypes = this.parentApp.isAllocateApp
      ? AllocateObjectDerivedTypes
      : QuardObjectDerivedTypes;
    const allShelves: QuardShelfTypes[] = Utils.getAllTypeShelves(objDerivedTypes, rootObject);
    allQuadChildren = allQuadChildren.concat(allShelves);

    // convert to QuardTreeBound type
    const boundaries = allQuadChildren.map(child => {
      const quadBound = child.getQuadBounds();
      const qtreeBounds = this.toQuardTreeBound(quadBound, child);
      return qtreeBounds;
    });

    return boundaries;
  }

  private toQuardTreeBound(itemSelector: QuadBounds, item: Position | QuardShelfTypes): QuardTreeBound {
    const parentObj = this.sharedService.getObject(item.$idParent, item.$sectionID);
    const bounds: QuardTreeBound = {
      x: itemSelector.left,
      y: itemSelector.top,
      z: itemSelector.back,
      width: itemSelector.width,
      height: itemSelector.height,
      depth: itemSelector.depth,
      id: item.$id,
      ObjectDerivedType: item.ObjectDerivedType,
      parentID: item.$idParent,
      FixtureDesc: item.Fixture.FixtureDesc,
      selectY: itemSelector.selectTop,
      selectHeight: itemSelector.selectHeight,
      minMerchHeight: itemSelector.minMerchHeight,
      rotationx: itemSelector.rotationx,
      backtop: itemSelector.backtop,
      yposToPog: item.getYPosToPog(),
      name: undefined,
      image: undefined,
      parentFixtureType: parentObj?.ObjectDerivedType
    };

    if (item.ObjectDerivedType === AppConstantSpace.POSITIONOBJECT) {
      bounds.name = item.Position.Product.Name;
      bounds.image = item.Position.ProductPackage.Images.front;
    }

    if (bounds.rotationx) {
      bounds.y = itemSelector.backtop;
    }

    return bounds;
  }

  // Used for debugging. Do not remove
  public drawQuads(sectionID: string, color: string = 'red', classname: string = 'commonClass', view: QuadtreeDrawParams = defaultDrawParams) {
    //Needed for testing purpose to draw the cordinates
    const documentSelector = $('body');

    const qtree = this.getQtree(sectionID);
    if (!(qtree)) { return; }

    type QuardDrawUnit = QuardTreeBound | QuadtreeNode<QuardTreeBound>;

    let nodes: QuardDrawUnit[] = qtree.root.getIntersectingChildren();
    nodes = nodes.concat(qtree.root.getChildren());
    nodes = nodes.concat(qtree.root.getNodes());

    var recursive = (nodes: QuardDrawUnit[]) => {
      for (let i = 0; i < nodes.length; i++) {
        var node = nodes[i];

        if ('id' in node) {
          node as QuardTreeBound;
          let y = node.y;
          var height = node.height;
          if (view.selectMode) {
            y = node.selectY;
            height = node.selectHeight;
          } else if (view.minMerchMode && node.ObjectDerivedType == AppConstantSpace.STANDARDSHELFOBJ) {
            y = node.y - node.minMerchHeight;
            height = node.minMerchHeight;
          }
          if (view.side) {
            documentSelector.append("<div class='" + classname + "' style='transform: rotation(" + node.rotationx + "deg) ;position: fixed; left:" + node.z + "px ; top:" + y + "px; height:" + height + "px; width:" + node.depth + "px; border: " + color + " 1px solid; z-index: 1000;'></div>");
          } else
            documentSelector.append("<div class='" + classname + "' style='position: fixed; left:" + node.x + "px ; top:" + y + "px; height:" + height + "px; width:" + node.width + "px; border: " + color + " 1px solid; z-index: 1000;'></div>");
        } else {
          node as QuadtreeNode<QuardTreeBound>;
          const stuckChildren: QuardDrawUnit[] = node.getIntersectingChildren();
          if (stuckChildren) {
            var quadNode: QuardDrawUnit[] = stuckChildren;
            quadNode = quadNode.concat(node.getChildren());
            quadNode = quadNode.concat(node.getNodes());
            if (quadNode.length) {
              recursive(quadNode);
            }
          }
        }
      }
    }
    recursive(nodes);
  }

  public retrieve(sectionID: string, bounds: RectangleBoundary) {
    const newQtree = this.getQtree(sectionID);
    if (!(newQtree)) { return; }

    const list = newQtree.retrieve(bounds);
    return list;
  }

  public findingIntersectionsOfChild(sectionID: string, items: ObjectListItem[] | undefined, minMerchCheck: boolean, tolerance: number): QuadChildIntersections {
    if (!tolerance) {
      tolerance = this.planogramStoreService.appSettings.FITCHECKTOLERANCE;
    }

    const qtree = this.getQtree(sectionID);
    if (!qtree) { return; }

    let nodes: (ObjectListItem | QuardTreeBound)[] = items;

    if (!nodes || !nodes.length) {
      nodes = qtree.allQuardChildren;
    }

    const pogOffset = { x: 0, y: 0 };

    let intersectingFlag = false;
    let minMerchCheckFlag = false;

    let intersectingFixtures: { [key: string]: string[] } = {};
    let minMerchIntersectFixtures: { [key: string]: string[] } = {};

    /*
    const isPosition = (obj: ObjectListItem | QuardTreeBound): boolean =>
      obj.ObjectDerivedType == AppConstantSpace.POSITIONOBJECT;
    const isStandardShelf = (obj: ObjectListItem | QuardTreeBound): boolean =>
      obj.ObjectDerivedType == AppConstantSpace.STANDARDSHELFOBJ;
    const isBlock = (obj: ObjectListItem | QuardTreeBound): boolean =>
      obj.ObjectDerivedType == AppConstantSpace.BLOCKOBJECT;
*/
    const recursive = (nodes: any[]) => {
      for (let childNode of nodes) {
        childNode as QuardTreeBound | ObjectListItem;
        const childId: string = childNode.$id || childNode.id;
        const childObj: ObjectListItem = childNode.$id ? childNode : this.sharedService.getObject(childId, sectionID);
        const childParentId = childNode.$idParent ? childNode.$idParent : childNode.parentID;
        const childParent: ObjectListItem = this.sharedService.getObject(childParentId, sectionID);

        if (childObj?.ObjectDerivedType == AppConstantSpace.BLOCKOBJECT ) { continue; }

        const itemSelector: QuadBounds = childObj.getQuadBounds();
        const bounds: PogObjectBoundary = {
          id: childId,
          yposToPog: childObj.getYPosToPog(),
          x: itemSelector.left,
          y: itemSelector.top,
          z: itemSelector.back,
          width: itemSelector.width,
          height: itemSelector.height,
          depth: itemSelector.depth,
          rotationx: itemSelector.rotationx,
          backtop: itemSelector.backtop
        };
        const retrievedChildren = this.retrieve(sectionID, bounds);
        const rect1: PogObjectCoordinates = {
          xstart: bounds.x + pogOffset.x,
          xend: bounds.x + bounds.width + pogOffset.x,
          ystart: bounds.y + pogOffset.y,
          yend: bounds.y + itemSelector.height + pogOffset.y,
          zstart: bounds.z,
          zend: bounds.z + itemSelector.depth,
          yselstart: bounds.backtop - itemSelector.height + pogOffset.y,
          yselend: bounds.backtop + pogOffset.y,
        };

        for (let quadChild of retrievedChildren) {
          const quadParent = this.sharedService.getObject(quadChild.parentID, sectionID);

          //Parent will not intersect with it's children
          if (childId == quadChild.parentID || quadChild.id == childParentId) { continue; }

          if (quadChild.ObjectDerivedType == AppConstantSpace.BLOCKOBJECT) { continue; }

          if (quadChild.id == childId
            || (childNode.ObjectDerivedType == AppConstantSpace.POSITIONOBJECT && quadChild.ObjectDerivedType == AppConstantSpace.POSITIONOBJECT
              && childParent.ObjectDerivedType == AppConstantSpace.STANDARDSHELFOBJ && quadParent.ObjectDerivedType == AppConstantSpace.STANDARDSHELFOBJ)
            || intersectingFixtures[quadChild.id]) { continue; }

          const rect2: PogObjectCoordinates = {
            xstart: quadChild.x + pogOffset.x,
            xend: quadChild.x + quadChild.width + pogOffset.x,
            ystart: quadChild.y + pogOffset.y,
            yend: quadChild.y + quadChild.height + pogOffset.y,
            zstart: quadChild.z,
            zend: quadChild.z + quadChild.depth,
            yselstart: quadChild.backtop - quadChild.height + pogOffset.y,
            yselend: quadChild.backtop + pogOffset.y,
          };
          if (this.collision.checkIfRectIntersect(rect1, rect2, tolerance, bounds, quadChild)) {
            intersectingFlag = true;
            var tempChildID = childId, tempQuadID = quadChild.id;
            if (childNode.ObjectDerivedType !== AppConstantSpace.POSITIONOBJECT && quadChild.ObjectDerivedType == AppConstantSpace.POSITIONOBJECT) {
              tempChildID = quadChild.id;
              tempQuadID = childId;
            }
            if (!intersectingFixtures[tempChildID]) {
              intersectingFixtures[tempChildID] = [];
            }
            intersectingFixtures[tempChildID].push(tempQuadID);
          } else if (minMerchCheck) {
            if (childObj.ObjectDerivedType == AppConstantSpace.STANDARDSHELFOBJ && quadChild.ObjectDerivedType !== AppConstantSpace.POSITIONOBJECT) {
              const minMerchrect: PogObjectCoordinates = {...rect1};
              minMerchrect.ystart = minMerchrect.ystart - itemSelector.minMerchHeight;
              minMerchrect.yend = minMerchrect.ystart + itemSelector.minMerchHeight;
              if (this.collision.checkIfRectIntersect(minMerchrect, rect2, tolerance, bounds, quadChild)) {
                minMerchCheckFlag = true;
                if (!minMerchIntersectFixtures[childId]) {
                  minMerchIntersectFixtures[childId] = [];
                }
                minMerchIntersectFixtures[childId].push(quadChild.id);
              }
            }
          }
        }
        if (intersectingFixtures[childId]) {
          intersectingFixtures[childId] = intersectingFixtures[childId]
            .filter((n, i) => intersectingFixtures[childId].indexOf(n) === i);
        }
        if (minMerchIntersectFixtures[childId]) {
          minMerchIntersectFixtures[childId] = minMerchIntersectFixtures[childId]
            .filter((n, i) => minMerchIntersectFixtures[childId].indexOf(n) === i);
        }
      }
    }

    recursive(nodes);

    this.minMerchCheckFixtures = minMerchCheckFlag ? minMerchIntersectFixtures : {};
    return {
      intersectingFlag: intersectingFlag,
      intersectingFixtures: intersectingFlag ? intersectingFixtures : {},
      minMerchCheckFlag: intersectingFlag,
      minMerchCheckFixtures: this.minMerchCheckFixtures,
    };
  }

  public findingIntersectionsAtBound(sectionID: string, bounds: RectangleBoundary, tolerance: number = 0): QuardTreeBound[] {
    const qtree = this.getQtree(sectionID);
    if (!(qtree)) { return; }

    const pogOffset = { x: 0, y: 0 };
    const rect1: RectangleCoordinates2d = {
      xstart: bounds.x + pogOffset.x,
      xend: bounds.x + bounds.width + pogOffset.x,
      ystart: bounds.y + pogOffset.y,
      yend: bounds.y + bounds.height + pogOffset.y,
    };

    const children = this.retrieve(sectionID, bounds);

    return children.filter((quadChild) => {
      var rect2: RectangleCoordinates2d = {
        xstart: quadChild.x + pogOffset.x,
        xend: quadChild.x + quadChild.width + pogOffset.x,
        ystart: quadChild.selectY + pogOffset.y,
        yend: quadChild.selectY + quadChild.selectHeight + pogOffset.y,
      };
      return this.collision.isIntersecting2D(rect1, rect2, tolerance);
    });
  }

  private setQuadtreeProperties() {
    // repeated logic read the property from localStorage
    const readOverrideValue = (key: string, defaultValue: number): number => {
      const valStr = this.localStorage.get<number>(key);
      if (!valStr) { return defaultValue; }

      const value = +valStr;
      if (value > 0) {
        this.log.success(`Overriding ${key} from ${defaultValue} to ${value}`)
        return value;
      }
      return defaultValue;
    };
    // current value
    this.log.info(`Default quardtree depth ${this.qtreeDepth}, node capacity: ${this.qtreeNodeCapacity}`);

    // If override value found, use that, else use the default
    const qtreeKeys = LocalStorageKeys.Quadtree;
    this.qtreeDepth = readOverrideValue(qtreeKeys.DEPTH, this.qtreeDepth);
    this.qtreeNodeCapacity = readOverrideValue(qtreeKeys.NODE_CAPACITY, this.qtreeNodeCapacity);
  }
}

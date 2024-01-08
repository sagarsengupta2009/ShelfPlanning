import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import * as THREE from 'three';
import { where, isEmpty } from 'underscore';
import * as d3 from 'd3';
import { AppConstantSpace, Utils } from '../../../../../../constants';
import { Pog3DObjects } from 'src/app/shared/models/sa-dashboard/app-planogram-apis';
import { SharedService, PlanogramService, ConfigService } from '../../../../../common/';
import { OrientationService } from './orientation.service';
import { ColorService, PlanogramStoreService, LabelsCommonService } from '../../../../../../services';
import { Orientation, Position, Section } from 'src/app/shared/classes';
import { MerchandisableList, ObjectListItem } from 'src/app/shared/services/common/shared/shared.service';
import {
  AnnotationType,
  IApiResponse,
  LabelCustomizedObject,
  SvgToolTip,
  labelData,
  svgTextObject
} from '../../../../../../models';
import { Mesh } from 'three';
import { LabelNumber } from 'src/app/shared/models/planogram-enums';
import { Redraw } from 'src/app/shared/models/render';
import { DividerTypes } from 'src/app/shared/constants/fixtureCrunchModes';
import { UtilsSVG } from 'src/app/shared/services/svg-render/svg-render-common/svg-utils';
import { BaseCommon } from 'src/app/shared/services/svg-render/svg-render-common/services/base-common.service';
import { DirectionImage, Images } from 'src/app/shared/models/planogram-transaction-api/pog-object-response';

THREE.Cache.enabled = true;

const ThreeMath = (THREE as any).Math;

@Injectable({
  providedIn: 'root'
})
export class ThreedPlanogramService {

  public threedModeChanger = new BehaviorSubject(false);
  public threedResetZoomChanger = new BehaviorSubject(false);
  public threedHeightZoomChanger = new BehaviorSubject(false);
  public threedAnnotationChanger = new BehaviorSubject(false);
  public threedLabelChanger = new BehaviorSubject(false);
  public threedReRender = new BehaviorSubject(false);
  public labelFieldDetails={};
  public overlapOccured:boolean;
  public labelFieldObj1:LabelCustomizedObject;
  public labelFieldObj2:LabelCustomizedObject;
  public reDrawLabels:Redraw={ //to redraw label when we do not have overlap but still with middle alignments labels get overlaps
      draw:false,
      label:0,
      yAlign:0
  };
  public data: SvgToolTip[] = [];
  public holdContainer: THREE.Object3D;
  private strokeWidth = 0.1;
  public svgTextObject1:{ svgHTML: string, svgTextObject: svgTextObject };
  public svgTextObject2:{ svgHTML: string, svgTextObject: svgTextObject };
  public bothVerticelOrientation:boolean = false;
  public bothDifferentOrientation:{status:boolean,labelHorizontal:number}= {
      status: false,
      labelHorizontal: 0
  };
  public bothHorizontalOrientation:boolean = false;
  private OrientNS_Rotation = [
    [0, 0, 0],
    [0, 0, 3 * Math.PI / 2],
    [0, 0, Math.PI],
    [0, 0, Math.PI / 2],
    [0, Math.PI / 2, 0],
    [Math.PI / 2, 0, 3 * Math.PI / 2],
    [Math.PI, 3 * Math.PI / 2, 0],
    [3 * Math.PI / 2, 0, Math.PI / 2],
    [Math.PI / 2, 0, 0],
    [Math.PI / 2, 3 * Math.PI / 2, 0],
    [Math.PI / 2, Math.PI, 0],
    [Math.PI / 2, Math.PI / 2, 0],
    [0, Math.PI, 0],
    [0, Math.PI, Math.PI / 2],
    [0, Math.PI, Math.PI],
    [0, Math.PI, 3 * Math.PI / 2],
    [0, 3 * Math.PI / 2, 0],
    [3 * Math.PI / 2, 0, 3 * Math.PI / 2],
    [Math.PI, Math.PI / 2, 0],
    [Math.PI / 2, 0, Math.PI / 2],
    [3 * Math.PI / 2, 0, 0],
    [3 * Math.PI / 2, Math.PI / 2, 0],
    [3 * Math.PI / 2, Math.PI, 0],
    [3 * Math.PI / 2, 3 * Math.PI / 2, 0]
  ];
  private orientNS: Orientation = new Orientation();
  constructor(
    private readonly http: HttpClient,
    private readonly config: ConfigService,
    private readonly planogramStore: PlanogramStoreService,
    private readonly sharedService: SharedService,
    private readonly planogramService: PlanogramService,
    private readonly orientationService: OrientationService,
    private readonly color: ColorService,
    private readonly labelsCommonService:LabelsCommonService
  ) { }

  // Changing the ThreeDItemData type to any across the file to close the bug #124112.
  // @Sagar, TODO: ThreeDItemData is not the correct type for those params, we need to work on the types again and #119193 user story is been re-opened for this.
  public ThreeD(itemData: any, parent: THREE.Object3D, doDispose, create3DModel, objectDerivedType: string, section?): void {
    switch (objectDerivedType) {
      case "Modular":
        this.threeDModular(itemData, parent, doDispose, create3DModel);
        break;
      case "StandardShelf":
        this.threeDStandardShelf(itemData, parent, doDispose, create3DModel);
        break;
      case "BlockFixture":
        this.threeDBlockFixture(itemData, parent, doDispose, create3DModel);
        break;
      case "Pegboard":
      case "Crossbar":
      case "Slotwall":
        this.threeDPegboard(itemData, parent, doDispose, create3DModel);
        break;
      case "Basket":
      case "CoffinCase":
        this.threeDCoffinCase(itemData, parent, doDispose, create3DModel);
        break;
      case "Position":
        this.threeDPosition(itemData, parent, doDispose, create3DModel);
        break;
      case "UprightDraw":
        this.threeDUprightDraw(itemData, parent, doDispose, create3DModel);
        break;
      case "ModularFront":
        this.threeDModularFront(itemData, parent, doDispose, create3DModel);
        break;
      case "Annotation":
        this.threeDAnnotation(itemData, parent, doDispose, create3DModel, section);
        break;
      case "Section":
        this.threeDSection(itemData, parent);
        break;
    }
  }

  private threeDSection(itemData: any, parent: THREE.Object3D): boolean {
    this.createSection(itemData, parent);
    return true;
  }

  private createSection(sectionObject: any, container: THREE.Object3D) {
    if (this.IsValidImageURL(sectionObject.FrontImage) || this.IsValidImageURL(sectionObject.BackImage)) {
      let width = sectionObject.Dimension.Width;
      let height = sectionObject.Dimension.Height;
      let depth = 0.01;

      let cube = this.ThreeDCreateOnlyImageBox(sectionObject, sectionObject.ObjectDerivedType + 'Bg', width, height, depth);

      cube.position.z = -1;

      container.add(cube);
    }
    return null;
  }

  private threeDModular(itemData: any, parent: THREE.Object3D, doDispose, create3DModel): boolean {
    this.createModular(itemData, parent, create3DModel);
    return true;
  }

  private createModular(modularObject, container, create3DModel) {
    let used3DModel = create3DModel(modularObject, container);
    if (used3DModel) return null;

    if (this.IsValidImageURL(modularObject.Fixture.FrontImage) || this.IsValidImageURL(modularObject.Fixture.BackImage)) {
      let width;
      let height;
      let depth;

      width = modularObject.Dimension.Width;
      height = modularObject.Dimension.Height;
      depth = .01;

      let cube = this.ThreeDCreateOnlyImageBox(modularObject, modularObject.objectDerivedType + 'Bg', width, height, depth);
      cube.position.z = cube.position.z - 0.5;
      container.add(cube);
    }

    return null;
  }

  private threeDStandardShelf(itemData, parent: THREE.Object3D, doDispose, create3DModel): boolean {
    this.createStandardShelf(itemData, parent);
    return true;
  }

  private createStandardShelf(shelfObject: any, container: THREE.Object3D) {
    // alway create the shelf we will remove it when/if the model is loaded
    if (1) {

      if (this.IsValidImageURL(shelfObject.Fixture.BackgroundFrontImage) || this.IsValidImageURL(shelfObject.Fixture.BackgroundBackImage)) {

        let bgWidth = shelfObject.Dimension.Width;
        let bgHeight = shelfObject.Dimension.Height;
        let bgDepth = 0.01;

        let cube = this.ThreeDCreateOnlyImageBox(shelfObject, shelfObject.ObjectDerivedType + 'Bg', bgWidth, bgHeight, bgDepth, true);

        cube.position.z = -0.2;

        container.add(cube);
      }
      let width;
      let height;
      let depth;

      width = shelfObject.Dimension.Width;
      if ('Thickness' in shelfObject.Fixture) {
        height = shelfObject.Fixture.Thickness;
      } else {
        height = 0; //shelfObject.Dimension.Height;
      }
      depth = shelfObject.Dimension.Depth;

      let itemColor = this.color.getIntColor(shelfObject.Fixture.Color, 0x808080);

      if (height == 0)
        return null;

      container.add(this.ThreeDCreateBoxSkuImageCube(width, height, depth, itemColor, shelfObject.Fixture, shelfObject.Name));

      if (this.IsValidImageURL(shelfObject.Fixture.ForegroundImage)) {
        let bgWidth = shelfObject.Dimension.Width;
        let bgHeight = shelfObject.Dimension.Height;
        let tile = shelfObject.Fixture.ForegroundImage?.LkDisplayType ?? 0;
        let plane = this.ThreeDCreateOnlyImagePlane(shelfObject, bgWidth, bgHeight, shelfObject.Fixture.ForegroundImage.Url, tile);
        plane.position.z = depth + 0.4;

        container.add(plane);
      }
      this.addGrillsStandardShelf(shelfObject, container);

      this.create3DLabel(shelfObject, container);
      return null;
    }
  }

  private addGrillsStandardShelf(shelfObject: any, shelfMesh: THREE.Object3D): void {
    if ((shelfObject.Fixture.FixtureType == 'StandardShelf') && this.planogramService.rootFlags[shelfObject.$sectionID].isGrillView) {
      let GrillInfo = shelfObject.getGrillEdgeInfo('front', shelfObject);
      if (GrillInfo != null) {
        let grillHeight = GrillInfo.Height;
        let grillSpacing = GrillInfo.Spacing;
        if ((GrillInfo.Display == true) && (GrillInfo.Height > 0)) {
          let GrillFront = this.createGrillStandardShelf(shelfObject, shelfObject.Dimension.Width, grillHeight, grillSpacing);
          GrillFront.position.x = shelfObject.Dimension.Width / 2;
          GrillFront.position.z = shelfObject.Dimension.Depth;
          GrillFront.position.y = shelfObject.Fixture.Thickness;
          GrillFront.position.z -= GrillInfo.Thickness;
          //GrillFront.scale.z = 5;
          shelfMesh.add(GrillFront);
        }
      }
    }
  }
private createTray(width: number, height: number, depth: number, trayHeight: number, trayOffsetX: number){
  let planeGeometry = new THREE.PlaneGeometry(width, height);
  let planeM = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 });
  let plane = new Mesh(planeGeometry, planeM);
  plane.position.x = width / 2;
  plane.position.y = height / 2;
  plane.position.z = (depth / 2);
  let traythickness = 0.6;
  let trayTOffset = traythickness/2;
  let trayWidth = width;// + (traythickness);
  let trayMaterial = new THREE.MeshBasicMaterial({color: 'black', transparent:false});
  let trayBaseG = new THREE.CylinderGeometry(traythickness, traythickness, trayWidth);
  let traySideG = new THREE.CylinderGeometry(traythickness, traythickness, trayHeight);
  let trayBase = new THREE.Mesh(trayBaseG, trayMaterial);
  let traySideLeft = new THREE.Mesh(traySideG, trayMaterial);
  let traySideRight = new THREE.Mesh(traySideG, trayMaterial);
  trayBase.position.y=-(height/2)+trayTOffset;
  trayBase.position.z=depth/2;
  trayBase.rotation.z = Math.PI/2;
  trayBase.position.x+=trayOffsetX;
  traySideLeft.position.x = -(width/2)+trayTOffset+trayOffsetX;
  traySideLeft.position.y = -(height-trayHeight)/2;
  traySideLeft.position.z=depth/2;
  traySideRight.position.x = (width/2)-trayTOffset+trayOffsetX;
  traySideRight.position.y = -(height-trayHeight)/2;;
  traySideRight.position.z=depth/2;
  plane.add(traySideLeft);
  plane.add(trayBase);
  plane.add(traySideRight);
  return plane;
}
  private createGrillStandardShelf(shelfObject: any, width: number, grillHeight: number, grillSpacing: number) {
    let Grill = new THREE.Object3D;
    let wireSize = .05;

    let frontGrillG = new THREE.CylinderGeometry(wireSize, wireSize, width);
    let grillMaterial = new THREE.MeshBasicMaterial({ color: 0x777777, transparent: false });
    // We should try to make this shiny
    //let grillMaterial = new THREE.MeshPhongMaterial({ color: 0x777777, transparent: false });

    let grillFront = new THREE.Mesh(frontGrillG, grillMaterial);
    grillFront.rotation.z = Math.PI / 2;
    grillFront.position.y = grillHeight;
    grillFront.position.z = wireSize;
    Grill.add(grillFront);
    if (grillHeight >= (grillSpacing * 2)) {
      let grillFront1 = grillFront.clone();
      grillFront1.position.y = grillHeight - grillSpacing;
      Grill.add(grillFront1);
    }
    let grillFront2 = grillFront.clone();
    grillFront2.position.y = 0;
    Grill.add(grillFront2);
    let frontGrillVertG = new THREE.CylinderGeometry(wireSize, wireSize, grillHeight);
    let grillFrontVertM = new THREE.Mesh(frontGrillVertG, grillMaterial);
    let grillSpaceVal = grillSpacing == 0 ? wireSize : grillSpacing;
    for (let i = 0; i <= width; i += (grillSpaceVal)) {
      let grillvert1 = grillFrontVertM.clone();
      grillvert1.position.x = i - width / 2;
      grillvert1.position.z = wireSize;
      grillvert1.position.y = grillHeight / 2;
      Grill.add(grillvert1);

    }
    grillFrontVertM.position.x = width / 2;
    grillFrontVertM.position.z = wireSize;
    grillFrontVertM.position.y = grillHeight / 2;
    Grill.add(grillFrontVertM);

    return Grill;
  }

  private threeDBlockFixture(itemData: any, parent: THREE.Object3D, doDispose, create3DModel): boolean {
    this.createBlockFixture(itemData, parent, create3DModel);
    return true;
  }

  public createBlockFixture(shelfObject: any, container: THREE.Object3D, create3DModel) {
    const used3DModel = create3DModel(shelfObject, container);
    if (used3DModel) return null;

    let width;
    let height;
    let depth;

    width = shelfObject.Dimension.Width;
    height = shelfObject.Dimension.Height;
    depth = shelfObject.Dimension.Depth;

    const itemColor = this.color.getIntColor(shelfObject.Fixture.Color, 0x808080);

    container.add(this.ThreeDCreateBoxSkuImageCube(width, height, depth, itemColor, shelfObject.Fixture, shelfObject.name));
    this.create3DLabel(shelfObject, container);
    return null;
  }

  private threeDPegboard(itemData: any, parent: THREE.Object3D, doDispose, create3DModel): boolean {
    this.createPegboard(itemData, parent, create3DModel);
    return true;
  }

  private createPegboard(shelfObject: any, container: THREE.Object3D, create3DModel) {   // TODO: @Bala need to define the type for create3DModel
    let used3DModel = create3DModel(shelfObject, container);
    if (used3DModel) return null;

    let width;
    let height;
    let depth;

    width = shelfObject.Dimension.Width;
    height = shelfObject.Dimension.Height;
    depth = .01;

    let itemColor = this.color.getIntColor(shelfObject.Fixture.Color, 0xD0D060);

    let z = 0
    if ('Thickness' in shelfObject.Fixture && shelfObject.Fixture.Thickness > 0) {
      depth = shelfObject.Fixture.Thickness;
      z = -shelfObject.Fixture.Thickness / 2;
    }
    let shelfBox = this.ThreeDCreateBoxSkuImageCube(width, height, depth, itemColor, shelfObject.Fixture, shelfObject.name);
    shelfBox.position.z = z;
    container.add(shelfBox);

    // Render Pegholes/Slots
    let PegHoleRadius = 0.125;
    let PegHoleMinSpacing = 0.25;
    if (this.sharedService.measurementUnit == 'METRIC') {  //metric
      PegHoleRadius = PegHoleRadius * 2.54;
      PegHoleMinSpacing = PegHoleMinSpacing * 2.54;
    }

    let pegHoleInfo = shelfObject.getPegHoleInfo();
    let pegBoardDim = shelfObject.Dimension;

    let startXPos = Utils.isNullOrEmpty(pegHoleInfo.PegOffsetLeft) ? 0 : pegHoleInfo.PegOffsetLeft;
    let endXPos = pegBoardDim.Width - pegHoleInfo.PegOffsetRight;

    let startYPos = Utils.isNullOrEmpty(pegHoleInfo.PegOffsetBottom) ? 0 : pegHoleInfo.PegOffsetBottom;
    let endYPos = pegBoardDim.Height - pegHoleInfo.PegOffsetTop;

    if (pegHoleInfo.PegIncrementY < PegHoleMinSpacing) pegHoleInfo.PegIncrementY = PegHoleMinSpacing;
    if (pegHoleInfo.PegIncrementX < PegHoleMinSpacing) {
      let slotWidth = endXPos - startXPos;
      let slgeometry = new THREE.PlaneGeometry(slotWidth, PegHoleRadius);
      let slmaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
      let slot = new THREE.Mesh(slgeometry, slmaterial);
      slot.userData = { Peg: "slot" };
      for (let y1 = startYPos; y1 <= endYPos; y1 += pegHoleInfo.PegIncrementY) {
        let sl = slot.clone();
        sl.position.x = startXPos + (slotWidth / 2);
        sl.position.y = y1;
        sl.position.z = .02;
        container.add(sl);
      }
    }
    else {
      let phgeometry = new THREE.CircleGeometry(PegHoleRadius);
      let phmaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
      let peghole = new THREE.Mesh(phgeometry, phmaterial);
      peghole.userData = { Peg: "peghole" };
      for (let y1 = startYPos; y1 <= endYPos; y1 += pegHoleInfo.PegIncrementY) {
        for (let x1 = startXPos; x1 <= endXPos; x1 += pegHoleInfo.PegIncrementX) {
          let ph = peghole.clone();
          ph.position.x = x1;
          ph.position.y = y1;
          ph.position.z = .02;
          container.add(ph);
        }
      }
    }

    this.create3DLabel(shelfObject, container);
    return null;
  }

  private threeDCoffinCase(itemData: any, parent: THREE.Object3D, doDispose, create3DModel): boolean {
    if (itemData.ObjectDerivedType == AppConstantSpace.COFFINCASEOBJ) {
      this.createCoffinCase(itemData, parent);
    } else if (itemData.ObjectDerivedType == AppConstantSpace.BASKETOBJ) {
      this.createBasket(itemData, parent);
    }

    return true;
  }

  private createCoffinCase(caseObject: any, container: THREE.Object3D) {
    // alway create the shelf we will remove it when/if the model is loaded
    if (1) {
      let itemColor = this.color.getIntColor(caseObject.Fixture.Color, 0x808080);

      //5 sides mesh declared
      let baseMesh,
        lMesh,
        rMesh,
        fMesh,
        bMesh;

      let subContainer = new THREE.Object3D();

      let info = caseObject.getCoffinCaseInfo();

      let options = { material: { transparent: true, opacity: 0.3, side: THREE.DoubleSide }, hideSideList: ["front", "back", "left", "right"] }
      baseMesh = this.ThreeDCreateBoxSkuImageCube(info.Width, info.BottomThickness, info.Depth, itemColor, caseObject.Fixture, caseObject.name, options);
      options = { material: { transparent: true, opacity: 0.3, side: THREE.DoubleSide }, hideSideList: ["front", "back", "right", "top", "bottom"] }
      lMesh = this.ThreeDCreateBoxSkuImageCube(info.SideThickness, info.Height - info.BottomThickness, info.Depth - (info.FrontThickness * 2), itemColor, caseObject.Fixture, caseObject.name, options);
      options = { material: { transparent: true, opacity: 0.3, side: THREE.DoubleSide }, hideSideList: ["front", "back", "left", "top", "bottom"] }
      rMesh = this.ThreeDCreateBoxSkuImageCube(info.SideThickness, info.Height - info.BottomThickness, info.Depth - (info.FrontThickness * 2), itemColor, caseObject.Fixture, caseObject.name, options);
      options = { material: { transparent: true, opacity: 0.3, side: THREE.DoubleSide }, hideSideList: ["back", "left", "right", "top", "bottom"] }
      fMesh = this.ThreeDCreateBoxSkuImageCube(info.Width, info.Height - info.BottomThickness, info.FrontThickness, itemColor, caseObject.Fixture, caseObject.name, options);
      options = { material: { transparent: true, opacity: 0.3, side: THREE.DoubleSide }, hideSideList: ["front", "left", "right", "top", "bottom"] }
      bMesh = this.ThreeDCreateBoxSkuImageCube(info.Width, info.Height - info.BottomThickness, info.FrontThickness, itemColor, caseObject.Fixture, caseObject.name, options);

      //positioning the meshes to form coffin case like structure
      baseMesh.rotation.x = Math.PI / 2;
      baseMesh.position.x = info.Width / 2;
      baseMesh.position.y = info.Depth / 2;
      baseMesh.position.z = info.BottomThickness / 2;

      lMesh.rotation.x = Math.PI / 2;
      lMesh.position.x = info.SideThickness / 2;
      lMesh.position.y = info.Depth / 2;
      lMesh.position.z = info.Height / 2 + info.BottomThickness / 2;


      rMesh.rotation.x = Math.PI / 2;
      rMesh.position.x = info.Width - info.SideThickness / 2;
      rMesh.position.y = info.Depth / 2;
      rMesh.position.z = info.Height / 2 + info.BottomThickness / 2;

      fMesh.rotation.x = Math.PI / 2;
      fMesh.position.x = info.Width / 2;
      fMesh.position.y = info.FrontThickness / 2;
      fMesh.position.z = info.Height / 2 + info.BottomThickness / 2;


      bMesh.rotation.x = Math.PI / 2;
      bMesh.position.x = info.Width / 2;
      bMesh.position.y = info.Depth - info.FrontThickness / 2;
      bMesh.position.z = info.Height / 2 + info.BottomThickness / 2;

      subContainer.add(baseMesh);
      subContainer.add(lMesh);
      subContainer.add(rMesh);
      subContainer.add(fMesh);
      subContainer.add(bMesh);

      subContainer.rotation.x = Utils.degToRad(-90);
      subContainer.position.z = info.Depth;

      container.add(subContainer);

      this.threeDSeperatorDraw(caseObject, container);
      this.create3DLabel(caseObject, container);
    }

    return null;
  }

  private createBasket(caseObject: any, container: THREE.Object3D) {
    // alway create the shelf we will remove it when/if the model is loaded
    if (1) {
      let itemColor = this.color.getIntColor(caseObject.Fixture.Color, 0x808080);
      let baseMesh;
      let subContainer = new THREE.Object3D();
      let info = caseObject.getCoffinCaseInfo();

      baseMesh = this.ThreeDCreateBoxSkuImageCube(info.Width, info.BottomThickness, info.Depth, itemColor, caseObject.Fixture, caseObject.name);

      //positioning the meshes to form coffin case like structure
      baseMesh.rotation.x = Math.PI / 2;
      baseMesh.position.x = info.Width / 2;
      baseMesh.position.y = info.Depth / 2;
      baseMesh.position.z = info.BottomThickness / 2;

      subContainer.add(baseMesh);

      subContainer.rotation.x = Utils.degToRad(-90);
      subContainer.position.z = info.Depth;

      container.add(subContainer);
      this.addGrillsBasket(caseObject, container);
      this.create3DLabel(caseObject, container);
    }

    return null;
  }

  private addGrillsBasket(caseObject: any, shelfMesh: THREE.Object3D): void {
    let grillSpacing = 2;
    let GrillFront = this.createGrillCoffinCase(caseObject, caseObject.Dimension.Width, caseObject.Dimension.Height, grillSpacing);
    GrillFront.position.x = caseObject.Dimension.Width / 2;
    GrillFront.position.z = caseObject.Dimension.Depth;
    GrillFront.position.y = caseObject.Fixture.Thickness;
    shelfMesh.add(GrillFront);
  }

  private createGrillCoffinCase(caseObject: any, width: number, grillHeight: number, grillSpacing: number) {
    let Grill = new THREE.Object3D;
    let wireSize = .05;
    let depth = caseObject.Dimension.Depth;

    let grillMaterial = new THREE.MeshBasicMaterial({
      color: 0x777777, transparent: false
    });
    //// We should try to make this shiny
    grillMaterial = new THREE.MeshPhongMaterial({
      color: 0x777777, transparent: false
    });

    //front grill vertical lines
    let frontGrillVertG = new THREE.CylinderGeometry(wireSize, wireSize, grillHeight);
    let grillFrontVertM = new THREE.Mesh(frontGrillVertG, grillMaterial);
    let grillSpaceVal = grillSpacing == 0 ? wireSize : grillSpacing;
    for (let i = 0; i <= width; i += (grillSpaceVal)) {
      let grillvert1 = grillFrontVertM.clone();
      grillvert1.position.x = i - width / 2;
      grillvert1.position.z = wireSize;
      grillvert1.position.y = grillHeight / 2;
      Grill.add(grillvert1);

    }
    grillFrontVertM.position.x = width / 2;
    grillFrontVertM.position.z = wireSize;
    grillFrontVertM.position.y = grillHeight / 2;
    Grill.add(grillFrontVertM);

    //front grill horizontal lines
    let frontGrillHoriG = new THREE.CylinderGeometry(wireSize, wireSize, width);
    let grillFrontHoriM = new THREE.Mesh(frontGrillHoriG, grillMaterial);
    grillSpaceVal = grillSpacing == 0 ? wireSize : grillSpacing;
    for (let i = 0; i <= grillHeight; i += (grillSpaceVal)) {
      let grillhori1 = grillFrontHoriM.clone();
      grillhori1.rotation.z = Math.PI / 2;
      grillhori1.position.y = i;
      grillhori1.position.z = wireSize;
      Grill.add(grillhori1);

    }
    grillFrontHoriM.rotation.z = Math.PI / 2;
    grillFrontHoriM.position.y = grillHeight / 2;
    grillFrontHoriM.position.z = wireSize;
    Grill.add(grillFrontHoriM);

    //back grill vertical lines
    let backGrillVertG = new THREE.CylinderGeometry(wireSize, wireSize, grillHeight);
    let grillBackVertM = new THREE.Mesh(backGrillVertG, grillMaterial);
    grillSpaceVal = grillSpacing == 0 ? wireSize : grillSpacing;
    for (let i = 0; i <= width; i += (grillSpaceVal)) {
      let grillvert1 = grillBackVertM.clone();
      grillvert1.position.x = i - width / 2;
      grillvert1.position.z = -depth;
      grillvert1.position.y = grillHeight / 2;
      Grill.add(grillvert1);

    }
    grillBackVertM.position.x = width / 2;
    grillBackVertM.position.z = wireSize;
    grillBackVertM.position.y = grillHeight / 2;
    Grill.add(grillBackVertM);

    //back grill horizontal lines
    let backGrillHoriG = new THREE.CylinderGeometry(wireSize, wireSize, width);
    let grillBackHoriM = new THREE.Mesh(backGrillHoriG, grillMaterial);
    grillSpaceVal = grillSpacing == 0 ? wireSize : grillSpacing;
    for (let i = 0; i <= grillHeight; i += (grillSpaceVal)) {
      let grillhori1 = grillBackHoriM.clone();
      grillhori1.rotation.z = Math.PI / 2;
      grillhori1.position.y = i;
      grillhori1.position.z = -depth;
      Grill.add(grillhori1);

    }
    grillBackHoriM.rotation.z = Math.PI / 2;
    grillBackHoriM.position.y = grillHeight / 2;
    grillBackHoriM.position.z = wireSize;
    Grill.add(grillBackHoriM);

    //left side grill vertical lines
    let leftGrillVertG = new THREE.CylinderGeometry(wireSize, wireSize, grillHeight);
    let grillLeftVertM = new THREE.Mesh(leftGrillVertG, grillMaterial);
    grillSpaceVal = grillSpacing == 0 ? wireSize : grillSpacing;
    for (let i = 0; i <= depth; i += (grillSpaceVal)) {
      let grillvert1 = grillLeftVertM.clone();
      grillvert1.position.x = -width / 2;
      grillvert1.position.z = -i;
      grillvert1.position.y = grillHeight / 2;
      Grill.add(grillvert1);

    }
    grillLeftVertM.position.x = width / 2;
    grillLeftVertM.position.z = -depth;
    grillLeftVertM.position.y = grillHeight / 2;
    Grill.add(grillLeftVertM);

    //left grill horizontal lines
    let leftGrillHoriG = new THREE.CylinderGeometry(wireSize, wireSize, depth);
    let grillLeftHoriM = new THREE.Mesh(leftGrillHoriG, grillMaterial);
    grillSpaceVal = grillSpacing == 0 ? wireSize : grillSpacing;
    for (let i = 0; i <= grillHeight; i += (grillSpaceVal)) {
      let grillhori1 = grillLeftHoriM.clone();
      grillhori1.position.x = -width / 2;
      grillhori1.rotation.x = Math.PI / 2;
      grillhori1.position.y = i;
      grillhori1.position.z = wireSize - depth / 2;
      Grill.add(grillhori1);

    }
    grillFrontHoriM.rotation.x = Math.PI / 2;
    grillFrontHoriM.position.y = grillHeight / 2;
    grillFrontHoriM.position.z = wireSize;
    Grill.add(grillFrontHoriM);

    //right side grill vertical lines
    let rightGrillVertG = new THREE.CylinderGeometry(wireSize, wireSize, grillHeight);
    let grillRightVertM = new THREE.Mesh(rightGrillVertG, grillMaterial);
    grillSpaceVal = grillSpacing == 0 ? wireSize : grillSpacing;
    for (let i = 0; i <= depth; i += (grillSpaceVal)) {
      let grillvert1 = grillRightVertM.clone();
      grillvert1.position.x = width / 2;
      grillvert1.position.z = -i;
      grillvert1.position.y = grillHeight / 2;
      Grill.add(grillvert1);

    }
    grillRightVertM.position.x = width / 2;
    grillRightVertM.position.z = -depth;
    grillRightVertM.position.y = grillHeight / 2;
    Grill.add(grillRightVertM);

    //left grill horizontal lines
    leftGrillHoriG = new THREE.CylinderGeometry(wireSize, wireSize, depth);
    grillLeftHoriM = new THREE.Mesh(leftGrillHoriG, grillMaterial);
    grillSpaceVal = grillSpacing == 0 ? wireSize : grillSpacing;
    for (let i = 0; i <= grillHeight; i += (grillSpaceVal)) {
      let grillhori1 = grillLeftHoriM.clone();
      grillhori1.position.x = width / 2;
      grillhori1.rotation.x = Math.PI / 2;
      grillhori1.position.y = i;
      grillhori1.position.z = wireSize - depth / 2;
      Grill.add(grillhori1);

    }
    grillFrontHoriM.rotation.x = Math.PI / 2;
    grillFrontHoriM.position.y = grillHeight / 2;
    grillFrontHoriM.position.z = wireSize;
    Grill.add(grillFrontHoriM);

    return Grill;
  }

  private threeDSeperatorDraw(itemData: any, parent: THREE.Object3D): boolean {
    //let dividerGap = itemData.getSeparatorInterval();
    let dividerGap;
    if (itemData.Fixture.SeparatorsData != undefined) {
      dividerGap = JSON.parse(itemData.Fixture.SeparatorsData);
    }
    else {
      dividerGap = null;
    }

    //if (dividerGap == null) return;
    if (Utils.isNullOrEmpty(dividerGap)) return;

    let dividerObj = where(itemData.Children, { ObjectDerivedType: AppConstantSpace.DIVIDERS })[0];
    let thickness = dividerObj?.Fixture?.Thickness;

    for (let i = 0; i < dividerGap.vertical.length; i++) {
      let verticalObj = dividerGap.vertical[i];
      let info = itemData.getCoffinCaseInfo();
      let geometry = new THREE.BoxGeometry(thickness, itemData.ChildDimension.Height, itemData.ChildDimension.Depth);
      let material = new THREE.MeshBasicMaterial({ color: '#708090' });
      let cube = new THREE.Mesh(geometry, material);

      cube.position.x = verticalObj.x;
      cube.position.y = itemData.ChildDimension.Height / 2;
      cube.position.z = itemData.ChildDimension.Depth - itemData.ChildDimension.Depth / 2 + info.FrontThickness;
      cube.name = "Divider";

      parent.add(cube);
    }

    for (let i = 0; i < dividerGap.horizontal.length; i++) {
      let horizontalObj = dividerGap.horizontal[i];
      let info = itemData.getCoffinCaseInfo();
      let geometry = new THREE.BoxGeometry(itemData.ChildDimension.Width, itemData.ChildDimension.Height, thickness);
      let material = new THREE.MeshBasicMaterial({ color: '#708090' });
      let cube = new THREE.Mesh(geometry, material);

      cube.position.x = itemData.ChildDimension.Width - itemData.ChildDimension.Width / 2 + info.SideThickness;
      cube.position.y = itemData.ChildDimension.Height - itemData.ChildDimension.Height / 2;
      cube.position.z = itemData.ChildDimension.Depth - horizontalObj.y;
      cube.name = "Divider";

      parent.add(cube);
    }
    return false;
  }

  private threeDPosition(itemData: any, parent: THREE.Object3D, doDispose, create3DModel): boolean {
    this.createPosition(itemData, parent, doDispose);

    return true;
  }
  public createLabelPositionCanvas(itemData: Position, fromShoppingCart: boolean, label?: LabelNumber): labelData {
    const currentLabel = this.planogramService.labelItem['POSITION_LABEL']['LABEL_'+ label];
    let AppSettingsSvc = this.planogramStore.appSettings;
    let labelOn: boolean = true;
    let labelAlways: boolean = false;
    // We need to check here that position label is on/off, the setting is in labelOn, not in shelfLabelOn
    if (!this.planogramService.labelOn) {
      if (!AppSettingsSvc.showLabelIfNoPackageImage) {
        labelOn = false;
      } else {
        switch (itemData.Position.IDOrientation) {
          case 0:
          case 1:
          case 2:
          case 3:
            if (itemData.Position.ProductPackage.Images.front == null) {
              labelAlways = true;
            }
            break;
          case 4:
          case 5:
          case 6:
          case 7:
            if (itemData.Position.ProductPackage.Images.left == null) {
              labelAlways = true;
            }
            break;
          case 8:
          case 9:
          case 10:
          case 11:
            if (itemData.Position.ProductPackage.Images.top == null) {
              labelAlways = true;
            }
            break;
          case 12:
          case 13:
          case 14:
          case 15:
            if (itemData.Position.ProductPackage.Images.back == null) {
              labelAlways = true;
            }
            break;
          case 16:
          case 17:
          case 18:
          case 19:
            if (itemData.Position.ProductPackage.Images.right == null) {
              labelAlways = false
            }
            break;
          case 20:
          case 21:
          case 22:
          case 23:
            if (itemData.Position.ProductPackage.Images.bottom == null) {
              labelAlways = false
            }
            break;
        }
        if (!labelAlways)
          labelOn = false;
      }
    }

    function getMaxWidth(context, tspans) {       // TODO: @Bala need to configure the 2d context type
      let maxWidth = 0;
      for (let n = 0; n < tspans.length; n++) {
        maxWidth = Math.max(maxWidth, context.measureText(tspans[n].textContent).width);
      }
      return maxWidth;
    }
    function drawText(context, tspans, x, y, lineHeight) {
      for (let n = 0; n < tspans.length; n++) {
        context.fillText(tspans[n].textContent, x, y);
        y += lineHeight;
      }
    }
    let parser = new DOMParser();
    let svgTextObject;
 //if(this.overlapOccured)
    if (this.labelsCommonService.checkLabelsShrinkFitStatus(this.labelFieldObj1,this.labelFieldObj2) && !fromShoppingCart) {
        svgTextObject = label == 1 ? this.svgTextObject1['svgTextObject'] : this.svgTextObject2['svgTextObject'];
    } else {
      svgTextObject = this.createLabelCustomized(itemData, this.planogramService['labelField' + label], "", {}, false, fromShoppingCart, currentLabel, label)['svgTextObject'];
    }

    if (svgTextObject == undefined || svgTextObject == null)
      return;

    let xLabel = parser.parseFromString(svgTextObject.textSVG, "text/html");
    let tspans = xLabel.getElementsByTagName("tspan");
    if (tspans.length == 0)
      return;

    if (fromShoppingCart) {
      let imgWidth: number;
      let imgHeight: number;
      switch (this.orientationService.ImageViews[itemData.Position.IDOrientation][1]) {
        case 0:
        case 180:
          imgWidth = itemData.Position.ProductPackage.Width;
          imgHeight = itemData.Position.ProductPackage.Height;

          break;
        case 90:
        case 270:
          imgWidth = itemData.Position.ProductPackage.Height;
          imgHeight = itemData.Position.ProductPackage.Width;
          break;
      }

      return { canvas: null, svgTextObject: svgTextObject, labelOn: labelOn, imgWidth: imgWidth, imgHeight: imgHeight, labelAlways: labelAlways };
    } else {
      let can = document.createElement('canvas');
      let fontSize = this.planogramService.convertToPixel(svgTextObject.fontSize / 10, itemData.$sectionID) * 4;
      let fontFamily = currentLabel.FONT_FAMILY;
      let fontStyle = currentLabel.FONT_STYLE;
      if (fontFamily == undefined || fontFamily.length < 1) { fontFamily = 'Roboto' }
      let lineHeight = fontSize * 10 / 8;
      can.width = this.planogramService.convertToPixel(svgTextObject.width, itemData.$sectionID) * 4;
      can.height = this.planogramService.convertToPixel(svgTextObject.height, itemData.$sectionID) * 4;
      can.style.width = can.width + 'px';
      can.style.height = can.height + 'px';
      let ctx = can.getContext('2d');
      ctx.font = fontStyle + ' ' + fontSize + 'px ' + fontFamily;
      let maxWidth = getMaxWidth(ctx, tspans);

      if (currentLabel.WORD_WRAP) {
        can.width = maxWidth;
        can.style.width = can.width + 'px';
        ctx.font = fontStyle + ' ' + fontSize * 0.95 + 'px ' + fontFamily;
        ctx.strokeStyle = currentLabel.STROKE_COLOR;
        ctx.fillStyle = currentLabel.BACKGROUND_COLOR;
        let x = 2, y = 2;

        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, y);

        for (let i = 0; i < tspans.length; i++) {
          x = UtilsSVG.getWidthOfTextByCanvas(tspans[i].textContent.trim(), fontFamily, fontSize) * 0.98;
          ctx.lineTo(x, y);
          y = y + lineHeight;
          ctx.lineTo(x, y);
        }
        ctx.lineTo(2, y);

        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.strokeStyle = currentLabel.STROKE_COLOR;
        ctx.lineWidth = 4;
        ctx.strokeRect(0, 0, can.width, can.height);
        ctx.fillStyle = currentLabel.BACKGROUND_COLOR;
       ctx.rect(2, 2, can.width - 5, can.height - 5);
        ctx.fill();
      }
      ctx.fillStyle = currentLabel.FONT_COLOR;
      ctx.scale(can.width / maxWidth, 1);
      drawText(ctx, tspans, 0, fontSize, lineHeight);
      return { canvas: can, svgTextObject: svgTextObject, labelOn: labelOn, imgWidth: 0, imgHeight: 0, labelAlways: labelAlways };
    }
  }

  private addLabelToContainer(container,ret,itemData,xPos,yPos){
    try {
    let pegInfo = itemData.getPegInfo();
    let geometry = new THREE.PlaneGeometry(ret.svgTextObject.width, ret.svgTextObject.height, 32);
    let texture = new THREE.Texture(ret.canvas);
    texture.minFilter = THREE.LinearMipMapLinearFilter;
    texture.needsUpdate = true;
    let material = new THREE.MeshBasicMaterial({ map: texture, transparent:true, opacity:ret.svgTextObject.labelObj.opacity });
    let userData = { Label: "position" };
    let plane = new THREE.Mesh(geometry, material);
    plane.userData = userData;
    plane.position.x = (ret.svgTextObject.rotateDeg == 90) ? ret.svgTextObject.height / 2 : ret.svgTextObject.width / 2;
    plane.position.y = (ret.svgTextObject.rotateDeg == 90) ? ret.svgTextObject.width / 2 : (ret.svgTextObject.height / 2) - ret.svgTextObject.height;
    plane.position.x += xPos;
    plane.position.y += yPos;
    plane.position.z = itemData.Dimension.Depth + pegInfo?.BackYOffset + .05;
    plane.rotation.z = Utils.degToRad(ret.svgTextObject.rotateDeg);
    if (!this.planogramStore.appSettings.shelfLabelOn) {
      plane.userData = { Label: true, labelOn: ret.labelOn, Mode: "image", labelAlways: ret.labelAlways };
    } else {
      plane.userData = { Label: true, labelOn: ret.labelOn, labelAlways: ret.labelAlways };
    }
    if (!ret.labelAlways) plane.visible = false;
    container.add(plane);
  }
  catch { }
  }

  private createTagCanvas(tagHeight: number, tagWidth: number, position: Position): HTMLCanvasElement {

    function getMaxWidth(context, tspans) {       // TODO: @Bala need to configure the 2d context type
      let maxWidth = 0;
      for (let n = 0; n < tspans.length; n++) {
        maxWidth = Math.max(maxWidth, context.measureText(tspans[n].textContent).width);
      }
      return maxWidth;
    }
    function drawText(context, tspans, x, y, lineHeight) {
      for (let n = 0; n < tspans.length; n++) {
        context.fillText(tspans[n].textContent, x, y);
        y += lineHeight;
      }
    }
    let parser = new DOMParser();
    let tagObj = { stroke: 'black', background: 'white', fontsize: 10, fontfamily: 'Roboto', fontStyle: 'bold', fontcolor: 'black', opacity: 100, shrinkToFit: true, type: '', text: '' };
    let textObj = this.createTextForWordWrap(tagHeight, tagWidth, tagObj.fontsize, tagObj);
    const whiteSpaceTransform = tagObj.type === AppConstantSpace.WHITESPACE ? 'transform:translate(0.45px,0.05px);' : '';
    let fontStyleData=tagObj.fontStyle=='bold'?`font-weight:${tagObj.fontStyle};`:(tagObj.fontStyle=='italic'?`font-style:${tagObj.fontStyle};`:'');
    let tspanSVG =  textObj.oldSvgTspanHTML || textObj.svgTspanHTML;
    let textSVG = `<text class="svgText" style="-webkit-font-smoothing: none;text-rendering:geometricPrecision;${whiteSpaceTransform}
    font-family:${tagObj.fontfamily};${fontStyleData};font-size:${textObj.permittedFontSize}px;text-anchor:start;opacity:${tagObj.opacity};fill:${tagObj.fontcolor};">${tspanSVG}</text>`;
    let xLabel = parser.parseFromString(textSVG, "text/html");
    let tspans = xLabel.getElementsByTagName("tspan");
    let can = document.createElement('canvas');
    can.width = this.planogramService.convertToPixel(tagWidth, position.$sectionID) * 4;
    can.height = this.planogramService.convertToPixel(tagHeight, position.$sectionID) * 4;
    can.style.width = can.width + 'px';
    can.style.height = can.height + 'px';
    let ctx = can.getContext('2d');
    ctx.beginPath();
    ctx.strokeStyle = tagObj.stroke;
    ctx.lineWidth = 4;
    ctx.strokeRect(0, 0, can.width, can.height);
    ctx.fillStyle = tagObj.background;
    ctx.rect(2, 2, can.width - 5, can.height - 5);
    ctx.fill();
    let fontSize = this.planogramService.convertToPixel(tagObj.fontsize / 10, position.$sectionID) * 4;
    let fontFamily = tagObj.fontfamily;
    let fontStyle = tagObj.fontStyle;
    if (fontFamily == undefined || fontFamily.length < 1) { fontFamily = 'Roboto' }
    ctx.font = fontStyle + ' ' + fontSize + 'px ' + fontFamily;
    ctx.fillStyle = tagObj.fontcolor;
    let maxWidth = getMaxWidth(ctx, tspans);
    ctx.scale(can.width / maxWidth, 1);
    drawText(ctx, tspans, 0, fontSize, fontSize * 10 / 8);
    return can;

  }
  private create3DLabelPosition(itemData: any, container: THREE.Object3D) {
    this.labelsCommonService.fromService = "3D";
    this.holdContainer = container;
    this.overlapOccured = false;
    this.labelFieldDetails={};
    this.reDrawLabels = {
        draw:false,
        label:0,
        yAlign: 0
    };
    this.svgTextObject1 = {
      svgHTML:'',
      svgTextObject:null
    };
    this.svgTextObject2 = {
      svgHTML:'',
      svgTextObject:null
    };
    this.bothVerticelOrientation = false;
    this.bothHorizontalOrientation = false;
        this.bothDifferentOrientation = {
            status: false,
            labelHorizontal: 0
        };
    const currentLabel1 = this.planogramService.labelItem['POSITION_LABEL']['LABEL_1'];
    const currentLabel2 = this.planogramService.labelItem['POSITION_LABEL']['LABEL_2'];
    this.labelFieldObj1 = itemData.getLabelCustomizedObject({}, this.planogramService.labelField1,currentLabel1);
   this.labelFieldObj2 = itemData.getLabelCustomizedObject({}, this.planogramService.labelField2,currentLabel2);
    let labelFirst =  this.labelsCommonService.getWhichLabelTORender(itemData,this.labelFieldObj1,this.labelFieldObj2);
    let labelSecond = labelFirst == LabelNumber.LABEL1? LabelNumber.LABEL2:LabelNumber.LABEL1;

    const currentLabel = this.planogramService.labelItem['POSITION_LABEL']['LABEL_1'];
    const parentItemData = this.sharedService.getObject(itemData.$idParent, itemData.$sectionID);
    let showPegLabel2 = this.planogramService.isPegboardLabelEnabled2 && parentItemData.ObjectDerivedType.toLowerCase() == AppConstantSpace.PEGBOARD? true:false;
        let showPegLabel1 = this.planogramService.isPegboardLabelEnabled1 && parentItemData.ObjectDerivedType.toLowerCase() == AppConstantSpace.PEGBOARD? true:false;
        let labelCheckCondition={};
        labelCheckCondition[labelFirst]={
            showPegLabel:labelFirst == 1?showPegLabel1:showPegLabel2,
            labelFeildisEnabled:labelFirst == 1?this.planogramService.labelFeild1isEnabled:this.planogramService.labelFeild2isEnabled,
            labelField:labelFirst == 1?this.planogramService.labelField1:this.planogramService.labelField2,
            isPegboardLabelEnabled:labelFirst == 1?this.planogramService.isPegboardLabelEnabled1:this.planogramService.isPegboardLabelEnabled1,
            labelNumber:labelFirst == 1?LabelNumber.LABEL1:LabelNumber.LABEL2,
            STRECH_TO_FACING:labelFirst == 1?this.planogramService.labelItem['POSITION_LABEL']['LABEL_1'].STRECH_TO_FACING:this.planogramService.labelItem['POSITION_LABEL']['LABEL_2'].STRECH_TO_FACING,
            svgText:''
        }
        labelCheckCondition[labelSecond]={
            showPegLabel:labelSecond == 1?showPegLabel1:showPegLabel2,
            labelFeildisEnabled:labelSecond == 1?this.planogramService.labelFeild1isEnabled:this.planogramService.labelFeild2isEnabled,
            labelField:labelSecond == 1?this.planogramService.labelField1:this.planogramService.labelField2,
            isPegboardLabelEnabled:labelSecond == 1?this.planogramService.isPegboardLabelEnabled1:this.planogramService.isPegboardLabelEnabled2,
            labelNumber:labelSecond == 1?LabelNumber.LABEL1:LabelNumber.LABEL2,
            STRECH_TO_FACING:labelSecond == 1?this.planogramService.labelItem['POSITION_LABEL']['LABEL_1'].STRECH_TO_FACING:this.planogramService.labelItem['POSITION_LABEL']['LABEL_2'].STRECH_TO_FACING,
            svgText:''
        }
        if(this.labelsCommonService.checkLabelsShrinkFitStatus(this.labelFieldObj1,this.labelFieldObj2)){
          labelCheckCondition[labelFirst].svgText = this.createLabelCustomized(itemData, this.planogramService['labelField'+labelFirst], "", {}, false, false,this.planogramService.labelItem['POSITION_LABEL']['LABEL_'+labelCheckCondition[labelFirst].labelNumber],labelCheckCondition[labelFirst].labelNumber);
          labelCheckCondition[labelSecond].svgText  = this.createLabelCustomized(itemData, this.planogramService['labelField'+labelSecond], "", {}, false, false,this.planogramService.labelItem['POSITION_LABEL']['LABEL_'+labelCheckCondition[labelSecond].labelNumber],labelCheckCondition[labelSecond].labelNumber);
            labelCheckCondition[labelFirst].labelNumber == 1 ? this.svgTextObject1 =  labelCheckCondition[labelFirst].svgText : this.svgTextObject2 = labelCheckCondition[labelFirst].svgText;
            labelCheckCondition[labelSecond].labelNumber == 1 ? this.svgTextObject1 =  labelCheckCondition[labelSecond].svgText : this.svgTextObject2 = labelCheckCondition[labelSecond].svgText;
            this.labelsCommonService.checkForLabelHeights(itemData,this.labelFieldDetails,this.labelFieldObj1,this.labelFieldObj2,this,false);
      }
        if(labelCheckCondition[labelFirst].showPegLabel){
          if(labelCheckCondition[labelFirst].labelFeildisEnabled && !labelCheckCondition[labelFirst].STRECH_TO_FACING){//stretch to facing false
            let ret: labelData = this.createLabelPositionCanvas(itemData, false,labelCheckCondition[labelFirst].labelNumber);//for label 1
           //for label2
            for(let i = 0; i < ret?.svgTextObject['xPosArray'].length;i++){
                this.addLabelToContainer(container,ret,itemData,ret?.svgTextObject['xPosArray'][i],ret.svgTextObject['yPosArray'][i]);
            }
        }
        }if(!labelCheckCondition[labelFirst].isPegboardLabelEnabled){
          if(labelCheckCondition[labelFirst].labelFeildisEnabled && !labelCheckCondition[labelFirst].STRECH_TO_FACING){//stretch to facing false
            let ret: labelData = this.createLabelPositionCanvas(itemData, false,labelCheckCondition[labelFirst].labelNumber);//for label 1
           //for label2
            for(let i = 0; i < ret?.svgTextObject['xPosArray'].length;i++){
                this.addLabelToContainer(container,ret,itemData,ret.svgTextObject['xPosArray'][i],ret.svgTextObject['yPosArray'][i]);
            }
        }
        }
   if(labelCheckCondition[labelSecond].showPegLabel){
    if( labelCheckCondition[labelSecond].labelFeildisEnabled && !labelCheckCondition[labelSecond].STRECH_TO_FACING){//stretch to facing false{
      let ret1: labelData = this.createLabelPositionCanvas(itemData, false, labelCheckCondition[labelSecond].labelNumber);
      for(let i = 0; i < ret1?.svgTextObject['xPosArray'].length;i++){
        this.addLabelToContainer(container,ret1,itemData,ret1?.svgTextObject['xPosArray'][i],ret1.svgTextObject['yPosArray'][i]);
      }
    }
   }if(!labelCheckCondition[labelSecond].isPegboardLabelEnabled){
    if( labelCheckCondition[labelSecond].labelFeildisEnabled && !labelCheckCondition[labelSecond].STRECH_TO_FACING){//stretch to facing false{
      let ret1: labelData = this.createLabelPositionCanvas(itemData, false, labelCheckCondition[labelSecond].labelNumber);
      for(let i = 0; i < ret1?.svgTextObject['xPosArray'].length;i++){
        this.addLabelToContainer(container,ret1,itemData,ret1?.svgTextObject['xPosArray'][i],ret1.svgTextObject['yPosArray'][i]);
      }
    }
   }

   if(labelCheckCondition[labelFirst].showPegLabel){
       if(labelCheckCondition[labelFirst].labelFeildisEnabled && labelCheckCondition[labelFirst].labelField.length > 0){
         let ret: labelData = this.createLabelPositionCanvas(itemData, false, labelCheckCondition[labelFirst].labelNumber);//label1
         if (ret) {
           this.addLabelToContainer(container, ret, itemData, ret?.svgTextObject.xPos, ret?.svgTextObject.yPos);
         }
       }
      }if(!labelCheckCondition[labelFirst].isPegboardLabelEnabled){
        if(labelCheckCondition[labelFirst].labelFeildisEnabled && labelCheckCondition[labelFirst].labelField.length > 0){
          let ret: labelData = this.createLabelPositionCanvas(itemData, false, labelCheckCondition[labelFirst].labelNumber);//label1
          if (ret) {
            this.addLabelToContainer(container, ret, itemData, ret?.svgTextObject.xPos, ret?.svgTextObject.yPos);
          }
         }
       }
       if(labelCheckCondition[labelSecond].showPegLabel){
       if(labelCheckCondition[labelSecond].labelFeildisEnabled &&  labelCheckCondition[labelSecond].labelField.length > 0){
         let ret1: labelData = this.createLabelPositionCanvas(itemData, false,  labelCheckCondition[labelSecond].labelNumber);//label2
         if (ret1) {
           this.addLabelToContainer(container, ret1, itemData, ret1?.svgTextObject.xPos, ret1?.svgTextObject.yPos);
         }
       }
      }if(!labelCheckCondition[labelSecond].isPegboardLabelEnabled){
        if( labelCheckCondition[labelSecond].labelFeildisEnabled &&  labelCheckCondition[labelSecond].labelField.length > 0){
          let ret1: labelData = this.createLabelPositionCanvas(itemData, false,  labelCheckCondition[labelSecond].labelNumber);//label2
          if (ret1) {
            this.addLabelToContainer(container, ret1, itemData, ret1?.svgTextObject.xPos, ret1?.svgTextObject.yPos);
          }
         }
       }




  }

  private createPosition(itemData: any, container: THREE.Object3D, doDispose) {

    let altColor = itemData.getColorForView();//getColorCode(item);
    let isTray =  itemData.Position.ProductPackage.IdPackageStyle == 1;
    let isCase = itemData.Position.ProductPackage.IdPackageStyle == 2;
    let trayHeight = 0;
    let dividerWidth = 0;
    // SKU Box
    let width = itemData.Dimension.Width;
    let height = itemData.Dimension.Height;
    let depth = itemData.Dimension.Depth;

    let geometry = new THREE.BoxGeometry(width, height, depth);
    let material = new THREE.MeshBasicMaterial({ color: altColor, transparent: true, opacity: 0.5 });
    let cube = new THREE.Mesh(geometry, material);
    cube.userData = { Mode: "sku" };
    let edges = new THREE.BoxHelper(cube, 0x000000);
    cube.add(edges);
    cube.visible = false;

    cube.position.x = width / 2;
    cube.position.y = height / 2;
    cube.position.z = (depth / 2);// + (overhangZBack);
    cube.name = itemData.$id;

    container.add(cube);

    let trayCaseChildrenCount = 0;
    let displayUnitsForTrayAndCase = this.planogramStore.appSettings.DisplayUnitsForTrayAndCase;
    if (displayUnitsForTrayAndCase && (isTray || isCase)) {
      let products = itemData?.$packageBlocks?.filter(pb => pb.type === 'product' && !pb.isUnitCap);
      for (let i = 0; i < products.length; i++) {
        let productDimensions = this.GetDimensions(products[i].orientation, false, this.orientationService.View.Front, itemData.Position.ProductPackage.Width, itemData.Position.ProductPackage.Height, itemData.Position.ProductPackage.Depth);
        let productWidth = productDimensions['Width'] + itemData.getShrinkWidth();
        productWidth = productDimensions['Width'] + itemData.getSKUGap(true, productDimensions['Width']);
        let productHeight = productDimensions['Height'] + itemData.getShrinkHeight(false, false, products[i].layoverUnder, !products[i].layoverUnder);
        let productDepth = productDimensions['Depth'] + itemData.getShrinkDepth(false, false, products[i].layoverUnder, !products[i].layoverUnder);
        let sectionObj: Section = this.sharedService.getObject(itemData.$sectionID, itemData.$sectionID) as Section;
        let unitPackageItemInfos = sectionObj.UnitPackageItemInfos.filter((unitDim) => { return unitDim.IDProduct == itemData.Position.IDProduct; })[0];
        const unitDimensions = this.GetDimensions(
          products[i].orientation,
          false,
          this.orientationService.View.Front,
          unitPackageItemInfos.Width,
          unitPackageItemInfos.Height,
          unitPackageItemInfos.Depth,
        );
        if (!itemData.unitPackageItemInfos) {
          itemData.unitPackageItemInfos = unitPackageItemInfos;
        }
        let marginOfError = this.planogramStore.appSettings.CutCaseMarginOfError ?? 0;
        let unitsX = Math.floor((productWidth / unitDimensions['Width']) + marginOfError);
        let unitsY = Math.floor((productHeight / unitDimensions['Height']) + marginOfError);
        let unitsZ = Math.floor((productDepth / unitDimensions['Depth']) + marginOfError);
        let unitWidth = (unitDimensions['Width'] * unitsX) > productWidth
          ? unitDimensions['Width'] - (((unitDimensions['Width'] * unitsX) - productWidth) / unitsX)
          : unitDimensions['Width'];
        let unitHeight = (unitDimensions['Height'] * unitsY) > productHeight
          ? unitDimensions['Height'] - (((unitDimensions['Height'] * unitsY) - productHeight) / unitsY)
          : unitDimensions['Height'];
        let unitDepth = (unitDimensions['Depth'] * unitsZ) > productDepth
          ? unitDimensions['Depth'] - (((unitDimensions['Depth'] * unitsZ) - productDepth) / unitsZ)
          : unitDimensions['Depth'];
        let showGap = this.planogramStore.appSettings.DisplayGapForExtraSpaceInTrayAndCase;
        let unitsXGap = showGap ? (productWidth % unitWidth) / (unitsX + 1) : 0;
        let unitsZGap = showGap ? (productDepth % unitDepth) / unitsZ : 0;
        let productLocX = unitsXGap + products[i].x;
        let productLocY = products[i].y;
        let productLocZ = products[i].z;
        for (let px = 0; px < products[i].wide; px++) {
          for (let py = 0; py < products[i].high; py++) {
            for (let pz = 0; pz < products[i].deep; pz++) {
              const trayCaseChild = {
                type: 'product',
                x: productLocX,
                y: productLocY,
                z: -productLocZ,
                wide: unitsX,
                high: unitsY,
                deep: unitsZ,
                gapX: unitsXGap,
                gapY: 0,
                gapZ: unitsZGap,
                orientation: products[i].orientation,
                itemHeight: unitHeight,
                itemWidth: unitWidth,
                itemDepth: unitDepth,
                isFingerSpaceIgnored: false,
                layoverUnder: false,
                isUnitCap: true,
                isTrayCaseChild: true
              };
              productLocZ += productDepth + products[i].gapZ;
              itemData.$packageBlocks.splice(trayCaseChildrenCount, 0, trayCaseChild);
              trayCaseChildrenCount++;
            }
            productLocY += productHeight + products[i].gapY;
            productLocZ = products[i].z;
          }
          productLocX += productWidth + products[i].gapX;
          productLocY = products[i].y;
          productLocZ = products[i].z;
        }
      }
    }

    // Image Box
    let drawEach = (location.search.toLowerCase().indexOf("draweach=false") == -1);
    let offsetZ = 0;
    for (let pBlockNum = 0; pBlockNum < itemData.$packageBlocks.length; pBlockNum++) {
      // loading values into local letiable for clarity and to shorten some of the code below
      let packageBlock = itemData.$packageBlocks[pBlockNum];
      let parent = this.sharedService.getObject(itemData.$idParent, itemData.$sectionID);
      if ('Dimension' in parent) {
        offsetZ = itemData.Dimension.Depth;
      }

      if (packageBlock.type == "divider") {
        let divColor = this.color.getIntColor(packageBlock.color, 0xC0C0C0);

        let geometry = new THREE.BoxGeometry(packageBlock.wide, packageBlock.high, packageBlock.deep);
        let material = new THREE.MeshBasicMaterial({ color: divColor });
        let cube = new THREE.Mesh(geometry, material);

        cube.position.x = packageBlock.x + packageBlock.wide / 2;
        cube.position.y = packageBlock.y + packageBlock.high / 2;
        cube.position.z = packageBlock.z + offsetZ - packageBlock.deep / 2;
        cube.name = "Divider";
        dividerWidth = packageBlock.wide;
        container.add(cube);

        continue;
      }
      let productWidth = 0;
      let productHeight = 0;
      let productDepth = 0;

      let dimensions = {};
      if (packageBlock.isTrayCaseChild) {
        dimensions = { Height: packageBlock.itemHeight, Width: packageBlock.itemWidth, Depth: packageBlock.itemDepth };
      } else if (packageBlock.isUnitCap) {
        dimensions = { Height: itemData.unitDimensions.unitHeight, Width: itemData.unitDimensions.unitWidth, Depth: itemData.unitDimensions.unitDepth };
      } else {
        // Note: Need to get dimension based on package block orientation for layovers
        dimensions = this.GetDimensions(packageBlock.orientation, false, this.orientationService.View.Front, itemData.Position.ProductPackage.Width, itemData.Position.ProductPackage.Height, itemData.Position.ProductPackage.Depth);
        dimensions['Width'] = dimensions['Width'] + itemData.getShrinkWidth();
        dimensions['Height'] = dimensions['Height'] + itemData.getShrinkHeight(false, false, packageBlock.layoverUnder, !packageBlock.layoverUnder);
        dimensions['Depth'] = dimensions['Depth'] + itemData.getShrinkDepth(false, false, packageBlock.layoverUnder, !packageBlock.layoverUnder);
      }
      productWidth = dimensions['Width'] + itemData.getSKUGap(true, dimensions['Width']);
      productHeight = dimensions['Height'];
      productDepth = dimensions['Depth'];

      if (packageBlock.x == dividerWidth && packageBlock.y == 0 && packageBlock.z == 0) trayHeight = productHeight / 2;
      let offset = { X: 0, Y: 0, Z: offsetZ };
      let createBoxPackageBlock = (mode) => {
        let boxBasicMesh = null;
        if (('shape' in packageBlock) && (packageBlock.shape.indexOf("Cyl") == 0)) {
          boxBasicMesh = this.createBasicProductCylinder(itemData.Position.Product.UPC, productWidth, productHeight, productDepth, altColor);
        } else {
          boxBasicMesh = this.createBasicProductBox(itemData.Position.Product.UPC, productWidth, productHeight, productDepth, altColor);
        }
        this.CreatePackageBlock(boxBasicMesh, packageBlock, container, itemData, offset, { Mode: mode });
        doDispose(boxBasicMesh);
      }
      if (drawEach) {
        let drawImage = true;

        if (packageBlock.isTrayCaseChild) {
          // the following adjustments done to avoid overlapping of box faces
          productWidth = productWidth * 0.98;
          productHeight = productHeight * 0.98;
          productDepth = productDepth * 0.98;
          offset.X = productWidth * 0.01;
          offset.Y = productHeight * 0.01;
          offset.Z = offsetZ - productDepth * 0.01;

        }
        if (drawImage) {
          let boxMesh = this.createProductBox(itemData.Position.Product.UPC, productWidth, productHeight, productDepth, packageBlock.isUnitCap ? itemData.unitPackageItemInfos.PackageImages : itemData.Position.ProductPackage.Images, altColor, itemData, packageBlock);
          this.CreatePackageBlock(boxMesh, packageBlock, container, itemData, offset, { Mode: "image" });
        }
        createBoxPackageBlock("box");
        this.create3DLabelPosition(itemData, container);
      } else {
        let boxMesh = this.createProductBox(itemData.Position.Product.UPC, productWidth * itemData.facings, productHeight * itemData.yFacings, productDepth * itemData.zFacings, itemData.positionDetail.product.images, altColor, itemData, packageBlock);
        let boxMeshL = this.createProductBox(itemData.Position.Product.UPC, productWidth * itemData.facings, productHeight * itemData.layoversDeep, productDepth * itemData.layovers, itemData.positionDetail.product.images, altColor, itemData, packageBlock);
        this.fillSKUBlockFake(boxMesh, boxMeshL, itemData.facings, [itemData.yFacings, itemData.zFacings], [itemData.layovers, itemData.layoversDeep], container);
        let boxBasicMesh = this.createBasicProductBox(itemData.Position.Product.UPC, productWidth * itemData.facings, productHeight * itemData.yFacings, productDepth * itemData.zFacings, altColor);
        let boxBasicMeshL = this.createBasicProductBox(itemData.Position.Product.UPC, productWidth * itemData.facings, productHeight * itemData.layoversDeep, productDepth * itemData.layovers, altColor);
        this.fillSKUBlockFake(boxBasicMesh, boxBasicMeshL, itemData.facings, [itemData.yFacings, itemData.zFacings], [itemData.layovers, itemData.layoversDeep], container);
        doDispose(boxBasicMesh);
        doDispose(boxBasicMeshL);
      }
    }

    itemData.$packageBlocks.splice(0, trayCaseChildrenCount);

    if (isTray) {
      let trayOffsetX = 0;
      const parentFixture = this.sharedService.getParentObject(itemData, itemData.$sectionID);
      if (parentFixture.Fixture.HasDividers && itemData.getDividerInfo(parentFixture)?.Type == DividerTypes.DividerLeft) {
        trayOffsetX = dividerWidth;
      }
      container.add(this.createTray(width-trayOffsetX, height, offsetZ, trayHeight, trayOffsetX));
    }

    if (this.IsValidImageURL(itemData.Position.EdgeImage)) {

      let edgeWidth = itemData.Dimension.Width;
      let edgeHeight = itemData._parent.Fixture.Thickness * Math.cos(UtilsSVG.degToRad(itemData._parent.Rotation.X));

      let tile = itemData.Position.EdgeImage?.LkDisplayType ?? 0;
      let plane = this.ThreeDCreateOnlyImagePlane(itemData, edgeWidth, edgeHeight, itemData.Position.EdgeImage.Url, tile);
      plane.position.y = -plane.position.y;
      plane.position.z = depth + 0.2;

      container.add(plane);
    }
    return cube;
  }

  private createBasicProductBox(UPC: string, Width: number, Height: number, Depth: number, altColor: string) {
    let geometry = new THREE.BoxGeometry(Width, Height, Depth);
    let material = new THREE.MeshBasicMaterial({ color: altColor, transparent: true, opacity: 0.5 });
    let cube = new THREE.Mesh(geometry, material);
    cube.userData = { Mode: "box" };
    let edges = new THREE.BoxHelper(cube, 0x000000);
    cube.add(edges);
    cube.visible = false;

    geometry.name = UPC;
    cube.name = UPC;

    return cube;
  }

  public logDirection(width: number, height: number, depth: number) {
    let diffX = Math.abs(height - depth);
    let diffY = Math.abs(width - depth);
    let diffZ = Math.abs(height - width);
    let lType = "X";
    if (diffY < Math.min(diffX, diffZ))
      lType = "Y";
    if (diffZ < Math.min(diffX, diffY))
      lType = "Z";
    return lType;
  };

  private createBasicProductCylinder(UPC: string, Width: number, Height: number, Depth: number, altColor: string) {
    let dir = this.logDirection(Width, Height, Depth);
    let r = 0;
    let h = 0;
    let xRotate = 0;
    let zRotate = 0;
    switch (dir) {
      case "X":
        r = Height / 2;
        h = Width;
        zRotate = Math.PI / 2;
        break;
      case "Y":
        r = Width / 2;
        h = Height;
        break;
      case "Z":
        r = Width / 2;
        h = Depth;
        xRotate = Math.PI / 2;
        break;
    }
    let geometry = new THREE.CylinderGeometry(r, r, h, 16, 1, false);
    geometry.rotateX(xRotate);
    geometry.rotateZ(zRotate);
    let eGeometry = new THREE.CylinderGeometry(r, r, h, 16, 1, true);
    eGeometry.rotateX(xRotate);
    eGeometry.rotateZ(zRotate);

    let material = new THREE.MeshBasicMaterial({ color: altColor, transparent: true, opacity: 0.5 });
    let mesh = new THREE.Mesh(geometry, material);
    let edges = new THREE.Mesh(eGeometry);
    mesh.add(edges);
    mesh.rotation.z = zRotate;
    mesh.userData = { Mode: "box" };
    mesh.visible = false;
    geometry.name = UPC;
    mesh.name = UPC;
    return mesh;
  }

  private createProductBox(UPC: string, Width: number, Height: number, Depth: number, images: string, altColor: number, position: Position, packageBlock: any) {
    return this.ThreeDCreateImageBox(UPC, Width, Height, Depth, images, altColor, { Mode: "image" }, false, true, null, null, position, packageBlock);
  }

  private CreatePackageBlock(box: Mesh, packageBlock, scene: THREE.Object3D, itemData: Position, offset: {X:number, Y: number, Z: number}, userData: any) {       // TODO: @Bala need to define the type for function

    let parentItemData = this.sharedService.getObject(itemData.$idParent, itemData.$sectionID) as MerchandisableList;

    let dimensions = {};
    if (packageBlock.isTrayCaseChild) {
      dimensions = { Height: packageBlock.itemHeight, Width: packageBlock.itemWidth, Depth: packageBlock.itemDepth };
    } else if (packageBlock.isUnitCap) {
      dimensions = { Height: itemData.unitDimensions.unitHeight, Width: itemData.unitDimensions.unitWidth, Depth: itemData.unitDimensions.unitDepth };
    } else {
      // Note: Need to get dimension based on package block orientation for layovers
      dimensions = this.GetDimensions(packageBlock.orientation, false, this.orientationService.View.Front, itemData.Position.ProductPackage.Width, itemData.Position.ProductPackage.Height, itemData.Position.ProductPackage.Depth);
      dimensions['Width'] = dimensions['Width'] + itemData.getShrinkWidth();
      dimensions['Height'] = dimensions['Height'] + itemData.getShrinkHeight(false, false, packageBlock.layoverUnder, !packageBlock.layoverUnder);
      dimensions['Depth'] = dimensions['Depth'] + itemData.getShrinkDepth(false, false, packageBlock.layoverUnder, !packageBlock.layoverUnder);
    }
    let Width = dimensions['Width'] + itemData.getSKUGap(true, dimensions['Width']);
    let Height = dimensions['Height'];
    let Depth = dimensions['Depth'];
    let offsetX = parentItemData.getOffsetValueX(itemData);
    let offsetY = parentItemData.getOffsetValueY(itemData);
    let drawPegs = false;
    let peglength = 0;
    let pegMesh = null;
    let pegOffsetX = 0;
    let pegOffsetY = 0;
    let PI ;
    let plane;
    let pegOverhangOffset = 0;
    let pegDepth = 0;
    if (parentItemData.ObjectDerivedType == AppConstantSpace.PEGBOARDOBJ || parentItemData.ObjectDerivedType == AppConstantSpace.SLOTWALLOBJ || parentItemData.ObjectDerivedType == AppConstantSpace.CROSSBAROBJ) {
      PI = itemData.getPegInfo();
      let isDoubleHole =  PI.FrontBars == 2;
      let totalBackSpacing = (PI.BackSpacing || 0 )*(PI.BackHooks-1);
      peglength = itemData.Position._X05_PEGLENGTH.ValData;
      if (itemData.Dimension.Depth < peglength) {
        pegDepth = itemData.Dimension.Depth - peglength;
      } else {
        pegDepth = 0;
        pegOverhangOffset = itemData.Dimension.Depth - peglength;
      }
      if (peglength > 0) {
        drawPegs = true;
        let PegRadius = 0.125;
        let PegEnd = 0.6;
        let PegEndAngle = Math.PI * 2 / 6;
        if (this.sharedService.measurementUnit == 'METRIC') {
          PegRadius = PegRadius * 2.54;
          PegEnd = PegEnd * 2.54;
        }
        let PegBump = (PegRadius * Math.sin(PegEndAngle));
        let PegEndBump = (PegRadius / 2 * Math.cos(PegEndAngle));
        //front bar and bumps
        let planeGeometry = new THREE.PlaneGeometry(peglength, Width);
        planeGeometry.applyMatrix4(new THREE.Matrix4().makeTranslation(-(peglength) / 2, 0, 0));
        let planeM = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 });
        plane = new Mesh(planeGeometry, planeM);
        let pegGeometry = new THREE.CylinderGeometry(PegRadius, PegRadius, peglength);
        pegGeometry.applyMatrix4(new THREE.Matrix4().makeTranslation(0, peglength / 2, Width/2));
        let pegMaterial = new THREE.MeshPhongMaterial({ color: 0x808080, reflectivity: .7, shininess: 50 }); //, wireframe: true });
        let frontBar1 = new THREE.Mesh(pegGeometry, pegMaterial);
        frontBar1.rotation.x = Math.PI / 2;
        frontBar1.rotation.z = Math.PI / 2;
        frontBar1.position.y =  ( itemData.Position.ProductPegHole1X || Width*(isDoubleHole?0.1:0.5));
        plane.add(frontBar1);
        //bump 1
        let bumpGeom = new THREE.CylinderGeometry(PegRadius, PegRadius, PegEnd + PegEndBump);//PegEnd + PegEndBump
        bumpGeom.applyMatrix4(new THREE.Matrix4().makeTranslation(0, (PegEnd + PegEndBump)/2, Width/2));
        let bump1 = new THREE.Mesh(bumpGeom, pegMaterial);
        bump1.rotation.x = Math.PI/2;
        bump1.rotation.z = -PegEndAngle;
        bump1.position.y =  ( itemData.Position.ProductPegHole1X || Width*(isDoubleHole?0.1:0.5));
        plane.add(bump1);
        // let sphereGeom = new THREE.SphereGeometry(PegRadius * 1.2, 8, 8);
        // let pegMaterial3 = new THREE.MeshPhongMaterial({ color: 'red', reflectivity: .7, shininess: 50 }); //, wireframe: true });
        // sphereGeom.applyMatrix4(new THREE.Matrix4().makeTranslation(0, 0, Width/2));
        // let sphere1 = new THREE.Mesh(sphereGeom, pegMaterial3);
        // sphere1.position.x = (PegEnd + PegEndBump) * Math.sin(PegEndAngle);
        // sphere1.position.z = (PegEnd + PegEndBump) * Math.cos(PegEndAngle);
        // plane.add(sphere1);
        if (isDoubleHole) {
          let frontBar2 = new THREE.Mesh(pegGeometry, pegMaterial);
          frontBar2.rotation.x = Math.PI / 2;
          frontBar2.rotation.z = Math.PI / 2;
          frontBar2.position.y = (itemData.Position.ProductPegHole2X || Width * 0.9);
          plane.add(frontBar2);
          let bump2 = new THREE.Mesh(bumpGeom, pegMaterial);
          bump2.rotation.x = Math.PI / 2;
          bump2.rotation.z = -PegEndAngle;
          bump2.position.y = (itemData.Position.ProductPegHole2X || Width * 0.9);
          plane.add(bump2);
        }
        //peg hooks
        pegMesh = new THREE.Object3D;
        let hookOffset = 0;
        hookOffset = (PI.OffsetX + PI.Offset2X - Width) / 2;
        //frontbar hook bar
        if (PI.FrontSpacing && isDoubleHole && PI.FrontSpacing > (PI.BackHooks - 1) * (isNaN(PI.BackSpacing) ? 0 : PI.BackSpacing)) {
          let hookGeom = new THREE.CylinderGeometry(PegRadius, PegRadius, PI.FrontSpacing);
          let pegHook = new THREE.Mesh(hookGeom, pegMaterial);
          pegHook.position.x += hookOffset;
          pegHook.position.z = pegDepth - PegBump;
          pegHook.rotation.z = Math.PI / 2;
          pegMesh.add(pegHook);
        }
        //back hook bar
        let hookGeom = new THREE.CylinderGeometry(PegRadius, PegRadius, totalBackSpacing);
        let pegHook = new THREE.Mesh(hookGeom, pegMaterial);
        pegHook.position.x += hookOffset;
        pegHook.position.z = pegDepth - PegBump;
        pegHook.rotation.z = Math.PI / 2;
        pegMesh.add(pegHook);
        //hook offset
        let hookInGeom = new THREE.CylinderGeometry(PegRadius, PegRadius, PI.BackYOffset);

        for (let i = 0; i < PI.BackHooks; i++) {
          let pegMeshHookIn = new THREE.Mesh(hookInGeom, pegMaterial);
          pegMeshHookIn.rotation.x = Math.PI / 2;
          pegMeshHookIn.position.x = (i) * (PI.BackSpacing || 0) - totalBackSpacing / 2;
          pegMeshHookIn.position.x += hookOffset;
          pegMeshHookIn.position.z = pegDepth - PI.BackYOffset / 2;
          pegMesh.add(pegMeshHookIn);
        }

        if (PI.OffsetX == 0) {
          pegOffsetX = Width / 2;
        }
        else {
          pegOffsetX = PI.OffsetX;
        }
        pegOffsetX -= Width / 2;
        if (PI.OffsetY == 0) {
          pegOffsetY = Height - (PegRadius * 2);
        }
        else {
          pegOffsetY = PI.OffsetY;
        }
        pegOffsetY -= Height / 2;
      }

    }

    let boxHasChild: boolean = box.children.length > 0;
    let bb: THREE.BufferGeometry;
    let mat: THREE.Material | THREE.Material[];
    let cubeEdges=null;
    if (boxHasChild) {
      box.children.forEach((child: Mesh) => {
        bb = child.geometry;
        mat = child.material;
      });
    }
    let pos = [];
    let rot = [];
    let scl = [];
    const cube = new THREE.InstancedMesh(box.geometry, box.material, packageBlock.wide * packageBlock.high * packageBlock.deep);
    const dummy = new THREE.Object3D();


    for (let facing = 0; facing < packageBlock.wide; facing++) {
      let xPos = (Width * facing + Width / 2) + packageBlock.x + offset.X;
      if (facing > 0) {
        xPos += facing * packageBlock.gapX;
      }
      for (let front = 0; front < packageBlock.high; front++) {
        let yPos = (Height * front + Height / 2) + packageBlock.y + offset.Y;
        if (front > 0) {
          yPos += front * packageBlock.gapY;
        }
        if (drawPegs) {
          let peg = pegMesh.clone();
          peg.position.x = xPos - offsetX;
          peg.position.y = yPos + offsetY + pegOffsetY - itemData.pegOffsetY;
          scene.add(peg);
        }

        for (let frontdeep = 0; frontdeep < packageBlock.deep; frontdeep++) {
          // let cloneName = box.name + "-" + facing + "-" + front + "-" + frontdeep;
          let zPos = -((Depth * frontdeep + Depth / 2)) + packageBlock.z + offset.Z;
          let slopeOffsetZ = 0;
          if(drawPegs){
            slopeOffsetZ = (peglength) * (1 - Math.cos(Utils.degToRad(Math.abs(PI?.HeightSlope))));
          }
          if (frontdeep > 0) {
            zPos -= frontdeep * packageBlock.gapZ;
          }
          zPos = zPos - slopeOffsetZ;
          if (packageBlock.z == 0) {
            if (plane) {
              let frontBarz = plane.clone();
              frontBarz.position.x = xPos - offsetX;
              frontBarz.position.y = yPos + offsetY + pegOffsetY;
              frontBarz.position.z = itemData.Dimension.Depth - slopeOffsetZ - pegOverhangOffset;
              frontBarz.rotation.x = Math.PI / 2 - Utils.degToRad(PI?.HeightSlope);
              frontBarz.rotation.z = Math.PI / 2;
              frontBarz.rotation.y = Math.PI;
              scene.add(frontBarz);

              //Tag
              if (parentItemData.ObjectDerivedType == AppConstantSpace.PEGBOARDOBJ && PI.IsPegTag &&
                !Utils.isNullOrEmpty(PI.TagXOffset) &&
                !Utils.isNullOrEmpty(PI.TagYOffset)) {
                if (!(PI.TagXOffset == 0 && PI.TagYOffset == 0)) {

                  let isDoubleHole = PI.FrontBars == 2;
                  let tagXBase = isDoubleHole ? (PI.OffsetX + PI.Offset2X) / 2 : PI.OffsetX;
                  let tagXLoc = tagXBase + PI.TagXOffset;
                  let tagYLoc = PI.OffsetY + PI.TagYOffset - PI.TagHeight;

                  let tagGeometry = new THREE.PlaneGeometry(PI.TagWidth, PI.TagHeight);
                  let tagCanvas = this.createTagCanvas(PI.TagHeight, PI.TagWidth, itemData);
                  let texture = new THREE.Texture(tagCanvas);
                  texture.minFilter = THREE.LinearMipMapLinearFilter;
                  texture.needsUpdate = true;
                  let tagMaterial = new THREE.MeshBasicMaterial({ map: texture, transparent: true, opacity: 100 });

                  let tag = new Mesh(tagGeometry, tagMaterial);
                  tag.position.z = frontBarz.position.z + 0.04;
                  tag.position.x = xPos - offsetX - Width / 2 + PI.TagWidth / 2 + tagXLoc;
                  tag.position.y = yPos + offsetY + tagYLoc - Height / 2 + PI.TagHeight / 2;

                  scene.add(tag);
                }
              }
            }
          }
          //cube.name = cloneName;
          let slopePegYPos = 0;
          if(drawPegs){
            slopePegYPos = (Depth) * Math.tan(Utils.degToRad(PI?.HeightSlope));
          }
          dummy.position.set(xPos - offsetX, yPos + offsetY - ((frontdeep) * slopePegYPos), zPos);
          // Note: Reason of commented this code block. Already rotate the dimension based on packageblock orientation so no need to rotate this dummy.
          // const [x, y, z] = this.OrientNS_Rotation[packageBlock.orientation];
          // dummy.rotation.set(x, y, z);
          dummy.updateMatrix();
          let index = facing * packageBlock.high * packageBlock.deep + front * packageBlock.deep + frontdeep;
          cube.setMatrixAt(index, dummy.matrix);
          //cube.rotation.x = Math.PI/3;
          if (boxHasChild) {
            pos.push(dummy.position.x, dummy.position.y, dummy.position.z);
            rot.push(dummy.quaternion.x, dummy.quaternion.y, dummy.quaternion.z, dummy.quaternion.w);
            scl.push(dummy.scale.x, dummy.scale.y, dummy.scale.z);
          }
        }
      }
    }
    cube.userData = userData;
    scene.add(cube);
    if(boxHasChild){
      var boxEdges = new THREE.EdgesGeometry(box.geometry.type === 'CylinderGeometry' ? bb : box.geometry);
      var lineGeom = new THREE.InstancedBufferGeometry().copy(boxEdges);
      lineGeom.instanceCount = packageBlock.wide * packageBlock.high * packageBlock.deep;
      lineGeom.setAttribute("instT", new THREE.InstancedBufferAttribute(new Float32Array(pos), 3));
      lineGeom.setAttribute("instR", new THREE.InstancedBufferAttribute(new Float32Array(rot), 4));
      lineGeom.setAttribute("instS", new THREE.InstancedBufferAttribute(new Float32Array(scl), 3));
      let lineMat = new THREE.LineBasicMaterial({ color: "black", transparent: true, opacity: 0.5 });
      lineMat.onBeforeCompile = (shader) => {
        shader.vertexShader = `
        attribute vec3 instT;
        attribute vec4 instR;
        attribute vec3 instS;
        vec3 trs( inout vec3 position, vec3 T, vec4 R, vec3 S ) {
            position *= S;
            position += 2.0 * cross( R.xyz, cross( R.xyz, position ) + R.w * position );
            position += T;
            return position;
        }
        ${shader.vertexShader}
        `.replace(
          `#include <begin_vertex>`,
          `#include <begin_vertex>
              transformed = trs(transformed, instT, instR, instS);
        `
        );
      }
      cubeEdges = new THREE.LineSegments(lineGeom, lineMat);
      cubeEdges.userData = userData;
      scene.add(cubeEdges);
    }
  }

  public GetDimensions(Orient: number, Lay: boolean, View: number, Width: number, Height: number, Depth: number) {
    let DimMap = [Width, Height, Depth];
    let NewOrient = (Lay == true) ? this.orientationService.LayoverOrientation[Orient] : Orient;
    let Dims = this.orientationService.OrientationToDim[this.orientationService.ViewOrientation[NewOrient][View]];
    let NewDims = [DimMap[Dims[0]], DimMap[Dims[1]], DimMap[Dims[2]]];
    NewDims['X'] = NewDims['Width'] = NewDims[0];
    NewDims['Y'] = NewDims['Height'] = NewDims[1];
    NewDims['Z'] = NewDims['Depth'] = NewDims[2];
    return NewDims;
  };

  private fillSKUBlockFake(box, boxL, facings, fronts, layovers, scene: THREE.Object3D): void {        // TODO: @Bala need to define the data type for the function.

    let Width = box.geometry.parameters.width;
    let Height = box.geometry.parameters.height;
    let Depth = box.geometry.parameters.depth;

    //Fronts
    let cloneName = box.name + "-" + facings + "-" + fronts[0] + "-" + fronts[1];
    let cubeFronts = box.clone();

    cubeFronts.name = cloneName;
    //front
    cubeFronts.material.materials[4].map.repeat.x = facings;
    cubeFronts.material.materials[4].map.repeat.y = fronts[0];
    //back
    cubeFronts.material.materials[5].map.repeat.x = facings;
    cubeFronts.material.materials[5].map.repeat.y = fronts[0];
    //Right
    cubeFronts.material.materials[0].map.repeat.x = fronts[1];
    cubeFronts.material.materials[0].map.repeat.y = fronts[0];
    //Left
    cubeFronts.material.materials[1].map.repeat.x = fronts[1];
    cubeFronts.material.materials[1].map.repeat.y = fronts[0];
    //Top
    cubeFronts.material.materials[2].map.repeat.x = facings;
    cubeFronts.material.materials[2].map.repeat.y = fronts[1];
    //Bottum
    cubeFronts.material.materials[3].map.repeat.x = facings;
    cubeFronts.material.materials[3].map.repeat.y = fronts[1];
    cubeFronts.position.x = (Width / 2);
    cubeFronts.position.y = (Height / 2);
    cubeFronts.position.z = -(Depth / 2);

    scene.add(cubeFronts);

    //Layovers
    cloneName = box.name + "-L-" + facings + "-" + layovers[0] + "-" + layovers[1];
    let cubeLayovers = boxL.clone();
    cubeLayovers.name = cloneName;

    //front
    cubeLayovers.material.materials[4].map.repeat.x = facings;
    cubeLayovers.material.materials[4].map.repeat.y = layovers[1];
    //back
    cubeLayovers.material.materials[5].map.repeat.x = facings;
    cubeLayovers.material.materials[5].map.repeat.y = layovers[1];
    //Right
    cubeLayovers.material.materials[0].map.repeat.x = layovers[0];
    cubeLayovers.material.materials[0].map.repeat.y = layovers[1];
    //Left
    cubeLayovers.material.materials[1].map.repeat.x = layovers[0];
    cubeLayovers.material.materials[1].map.repeat.y = layovers[1];
    //Top
    cubeLayovers.material.materials[2].map.repeat.x = facings;
    cubeLayovers.material.materials[2].map.repeat.y = layovers[0];
    //Bottom
    cubeLayovers.material.materials[3].map.repeat.x = facings;
    cubeLayovers.material.materials[3].map.repeat.y = layovers[0];

    cubeLayovers.position.x = (Width / 2);
    cubeLayovers.position.y = Height + (boxL.geometry.parameters.depth / 2);
    cubeLayovers.position.z = -(boxL.geometry.parameters.height / 2);
    cubeLayovers.rotation.x = Math.PI / 2;
    scene.add(cubeLayovers);
  }

  private threeDUprightDraw(itemData: any, parent: THREE.Object3D, doDispose, create3DModel): boolean {

    let notchArr = [];
    if ('getNotchInterval' in itemData) {
      notchArr = itemData.getNotchInterval();
    }

    // TODO: @malu itemData to Section, does any other type applicable here?
    let uprightGap = [];
    if ('uprightIntervals' in itemData) {
      uprightGap = itemData.uprightIntervals;
    }

    const upright = this.makeUpright("center", itemData, notchArr);

    for (var i = 0; i < uprightGap.length; i++) {
      var thisUpright;
      switch (uprightGap[i]) {
        case 0:
          thisUpright = this.makeUpright("left", itemData, notchArr);
          break;
        case itemData.Dimension.Width:
          thisUpright = this.makeUpright("right", itemData, notchArr);
          break;
        default:
          thisUpright = (i == (uprightGap.length - 1)) ? upright : upright.clone();
          break;
      }
      thisUpright.position.x = uprightGap[i];
      parent.add(thisUpright);
    }
    return true;
  }

  private makeUpright(type: string, itemData: any, notchArr: any[]) {
    let width = .36;
    let height = .75;
    let depth = .36;
    let offset = 1;
    if (this.sharedService.measurementUnit == 'METRIC') {  //metric
      width = width * 2.54;
      height = height * 2.54;
      depth = depth * 2.54;
      offset = offset * 2.54;
    }
    let widthOffset = 0;
    let barWidth = offset * 2;
    let barOffset = 0;
    switch (type) {
      case "left":
        width = width / 2;
        widthOffset = width / 2;
        barWidth = offset;
        barOffset = offset / 2;
        break;
      case "right":
        width = width / 2;
        widthOffset = -width / 2;
        barWidth = offset;
        barOffset = -offset / 2;
        break;
    }
    let upright = new THREE.Object3D();
    let geometry = new THREE.BoxGeometry(barWidth, itemData.Dimension.Height, depth);
    let material = new THREE.MeshPhongMaterial({ color: 0xc0c0c0 });
    let uprightBar = new THREE.Mesh(geometry, material);
    upright.add(uprightBar);
    uprightBar.position.x = barOffset;
    uprightBar.position.y = itemData.Dimension.Height / 2;
    uprightBar.position.z = (-depth / 2) - .01;
    const edges = new THREE.BoxHelper(uprightBar, 0x000000);
    upright.add(edges);

    if (notchArr.length != 0) {
      var notchHoleGeometry = new THREE.PlaneGeometry(width, height);
      var notchHoleMaterial = new THREE.MeshPhongMaterial({ color: 'slategrey' });
      var notchHole = new THREE.Mesh(notchHoleGeometry, notchHoleMaterial);
      notchHole.position.x = widthOffset;
      for (var j = 0; j < notchArr.length; j++) {
        var yPos = notchArr[j];
        var thisnotchHole = (j == (notchArr.length - 1)) ? notchHole : notchHole.clone();
        thisnotchHole.position.y = yPos;
        upright.add(thisnotchHole);
      }
    } else {
      const notchHoleGeometry = new THREE.PlaneGeometry(.1, itemData.Dimension.Height);
      const notchHoleMaterial = new THREE.MeshPhongMaterial({ color: 'black' });
      let notchHole = new THREE.Mesh(notchHoleGeometry, notchHoleMaterial);
      notchHole.position.y = itemData.Dimension.Height / 2;
      upright.add(notchHole);
    }
    return upright;
  }

  private threeDModularFront(itemData: any, parent: THREE.Object3D, doDispose, create3DModel): boolean {

    for (let i = 0; i < itemData.Children.length; i++) {
      if (itemData.Children[i].ObjectDerivedType == "Modular") {
        if (itemData.Children[i].Fixture.FrontImage && itemData.Children[i].Fixture.FrontImage.FarFrontUrl && itemData.Children[i].Fixture.FrontImage.FarFrontUrl.length > 0) {
          let height = itemData.Children[i].Dimension.Height;
          let width = itemData.Children[i].Dimension.Width;
          let Z = itemData.Children[i].Dimension.Depth;
          let offset = itemData.Children[i].Location.X;

          let geometry = new THREE.PlaneGeometry(width, height, 32);
          let loader = new THREE.TextureLoader();
          loader.setCrossOrigin('');
          let texture = loader.load(itemData.Children[i].Fixture.FrontImage.FarFrontUrl);
          texture.minFilter = THREE.LinearMipMapLinearFilter;
          const material1 = new THREE.MeshBasicMaterial({ map: texture, transparent: true, side: THREE.DoubleSide });

          let plane = new THREE.Mesh(geometry, material1);
          plane.userData = { Mode: "all" };
          plane.position.x = offset + width / 2;
          plane.position.y = height / 2;
          plane.position.z = Z + .7;

          parent.add(plane);

        }
      }
    }

    return true;
  }

  public threeDAnnotation(itemData: any, parent, doDispose, create3DModel, section: Section) {
    function wrapText(context, data, text, x, y, maxWidth, lineHeight) {
      function scaleMeasureText(context, text, fontsize, originalFontSize) {
        let width = context.measureText(text).width;
        if (parseFloat(originalFontSize) != fontsize) { width = width * fontsize / parseFloat(originalFontSize); }
        return width;
      }
      const lines = text.split(/\r?\n|\r/);
      const underline = data.Attribute?.Font?.underline;
      const originalFontSize = lineHeight*0.8;
      for (let li = 0; li < lines.length; li++) {
        let words = lines[li].split(' '),
          line = '',
          i,
          test,
          metricswidth;
        for (i = 0; i < words.length; i++) {
          test = words[i];
          metricswidth = scaleMeasureText(context, test, fontSize, originalFontSize);
          while (metricswidth > maxWidth) {
            // Determine how much of the word will fit
            test = test.substring(0, test.length - 1);
            metricswidth = scaleMeasureText(context, test, fontSize, originalFontSize);
          }
          if (words[i] != test) {
            words.splice(i + 1, 0, words[i].substr(test.length));
            words[i] = test;
          }

          if (i === words.length - 1 && (i !== 0 || words[i] !== '')) {
            test = line + words[i];
          } else {
            test = line + words[i] + ' ';
          }
          metricswidth = scaleMeasureText(context, test, fontSize, originalFontSize);
          let underscoreCount = Math.ceil(scaleMeasureText(context, line, fontSize, originalFontSize) /  scaleMeasureText(context, '_', fontSize, originalFontSize));
          if (metricswidth > maxWidth && i > 0) {
            if (data.Attribute.iPointSize) {
              context.fillText(line, (maxWidth / 2) - (metricswidth / 2), y);
              underline ? context.fillText('_'.repeat(underscoreCount), (maxWidth / 2) - (metricswidth / 2), 1.0275*y) : '';
            } else {
              context.fillText(line, x, y);
              underline ? context.fillText('_'.repeat(underscoreCount), x, 1.0275*y) : '';
            }
            line = words[i] + ' ';
            y += lineHeight;
          }
          else {
            line = test;
          }
          if (words.length > (lines[li].length + 1)) break;
        }
        let underscoreCount = Math.ceil(scaleMeasureText(context, line, fontSize, originalFontSize) /  scaleMeasureText(context, '_', fontSize, originalFontSize));
        if (data.Attribute.iPointSize) {
          context.fillText(line, (maxWidth / 2) - (metricswidth / 2), y);
          underline ? context.fillText('_'.repeat(underscoreCount), (maxWidth / 2) - (metricswidth / 2), 1.0275*y) : '';
        } else {
          context.fillText(line, x, y);
          underline? context.fillText('_'.repeat(underscoreCount), x, 1.0275*y): '';
        }
        y += lineHeight;
      }
    }


    var coord = this.calcConnectorCoord(itemData, section, parent);
    var geometry = new THREE.PlaneGeometry(itemData.Attribute.location.width, itemData.Attribute.location.height, 32);
    var materials = [];
    var userData;
    if (itemData.LkExtensionType == AnnotationType.IMAGE_POP) {
      var loader = new THREE.TextureLoader();
      loader.setCrossOrigin('');
      var texture = loader.load(itemData.Attribute.imgUrl.replace(/'/g, '%27'),
        function (texture) {
          function resizeImage(image) {
            if (image instanceof HTMLImageElement || image instanceof HTMLCanvasElement || image instanceof ImageBitmap) {
              var canvas = <HTMLCanvasElement>document.createElementNS('http://www.w3.org/1999/xhtml', 'canvas');
              canvas.width = ThreeMath.ceilPowerOfTwo(image.width);
              canvas.height = ThreeMath.ceilPowerOfTwo(image.height);
              var context = canvas.getContext('2d');
              context.drawImage(image, 0, 0, canvas.width, canvas.height);
              return canvas;
            }
            return image;
          }

          if ((texture.wrapS == THREE.RepeatWrapping) || (texture.wrapT == THREE.RepeatWrapping)) {
            if (!ThreeMath.isPowerOfTwo(texture.image.width) || !ThreeMath.isPowerOfTwo(texture.image.height)) {
              texture.image = resizeImage(texture.image);
            }
          }
        }
      );
      texture.minFilter = THREE.LinearMipMapLinearFilter;
      if (itemData.Attribute.imgDispType == "tile") {
        texture.wrapT = THREE.RepeatWrapping;
        texture.wrapS = THREE.RepeatWrapping;
        var repeatH = this.planogramService.convertToPixel(itemData.Attribute.location.width, section.$id) / itemData.Attribute.imgWidth;
        var repeatV = this.planogramService.convertToPixel(itemData.Attribute.location.height, section.$id) / itemData.Attribute.imgHeight;
        texture.repeat.set(repeatH, repeatV);
        texture.offset.set(0, 1 - repeatV);
      }
      var material1 = new THREE.MeshBasicMaterial({ map: texture, transparent: true, side: THREE.DoubleSide });
      materials.push(material1);
      if ((itemData.Attribute.style.bgcolor.toLowerCase() != "#fff") && (itemData.Attribute.style.bgcolor.toLowerCase() != "#ffffff")) {
        var material2 = new THREE.MeshBasicMaterial({ color: itemData.Attribute.style.bgcolor, side: THREE.DoubleSide });
        materials.push(material2);
        materials.push(material1);
      }
      userData = { Annotation: "image" };
    } else {
      var can = document.createElement('canvas');
      var imageMaxWidth = ThreeMath.ceilPowerOfTwo(2048 * itemData.Attribute.location.width / section.getWidth());
      var wRatio = imageMaxWidth / itemData.Attribute.location.width;
      var aspectRatio = itemData.Attribute.location.width / itemData.Attribute.location.height;
      can.width = imageMaxWidth;
      can.height = ThreeMath.ceilPowerOfTwo(itemData.Attribute.location.height * wRatio);
      var heightRatio = (itemData.Attribute.location.height * wRatio) / can.height;
      var offset = (1 - heightRatio) * can.height;
      can.style.width = can.width + 'px';
      can.style.height = can.height + 'px';
      var ctx = can.getContext('2d');
      ctx.beginPath();
      ctx.fillStyle = itemData.Attribute.style.bgcolor;
      ctx.rect(0, 0, can.width, can.height);
      ctx.fill();
      var fontSize = parseInt(itemData.Attribute.style.fontsize) * wRatio / 8;
      let italicBold = (itemData.Attribute.Font?.italic ? 'italic ' : '') + (itemData.Attribute.Font?.weight ? 'bold' : '');
      ctx.font = (italicBold ? italicBold + ' ' : '') + fontSize + 'px ' + itemData.Attribute.style.fontfamily;
      if ([AnnotationType.FREEFLOW_TEXT, AnnotationType.TEXT_ANNOTATION].includes(itemData.LkExtensionType)) {
        ctx.fillStyle = itemData.Attribute.style.color;
        wrapText(ctx, itemData, itemData.Content, 0, offset + (fontSize * 10 / 8), can.width, fontSize * 10 / 8);
        var texture = new THREE.Texture(can);
        texture.wrapT == THREE.RepeatWrapping;
        texture.minFilter = THREE.LinearMipMapLinearFilter;
        texture.repeat.set(1, (itemData.Attribute.location.height * wRatio) / can.height);
        texture.needsUpdate = true;
        materials.push(new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide }));
        userData = { Annotation: "text" };
      } else {
        materials.push(new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 }));
        userData = { Annotation: "image" };
      }
    }
    for (var n = 0; n < materials.length; n++) {
      var plane = new THREE.Mesh(geometry, materials[n]);
      plane.userData = userData;
      plane.position.x = itemData.left() + itemData.Attribute.location.width / 2;
      plane.position.y = itemData.bottom() + itemData.Attribute.location.height / 2;
      plane.position.z = coord['z1'] - (n * .01);
      if (itemData.LkExtensionType == AnnotationType.FREEFLOW_CONNECTOR) {
        let fConnMaterial = new THREE.MeshBasicMaterial({ color: itemData.Attribute.style.lncolor, transparent: false });
        let fConnGeom = new THREE.CylinderGeometry(0.1, 0.1, Math.sqrt(Math.pow(itemData.Attribute.location.width, 2) + Math.pow(itemData.Attribute.location.height, 2)));
        let freeFlowConnector = new THREE.Mesh(fConnGeom, fConnMaterial);
        let rotation = Math.atan(itemData.Attribute.location.height / itemData.Attribute.location.width);
        freeFlowConnector.rotation.z = (rotation);
        plane.add(freeFlowConnector);
      }
      parent.add(plane);
    }
    if ([AnnotationType.TEXT_ANNOTATION, AnnotationType.FREEFLOW_TEXT, AnnotationType.FREEFLOW_BOX].includes(itemData.LkExtensionType)) {
      var helper = new THREE.BoxHelper(plane, itemData.Attribute.style.lncolor);
      helper.userData = userData;
      parent.add(helper);
    }
    if (coord && !coord.noCallOut) {
      var startPos = new THREE.Vector3(coord.x1, section.Dimension.Height - coord.y1, coord['z1']);
      var endPos = new THREE.Vector3(coord.x2, section.Dimension.Height - coord.y2, coord['z2']);
      var calloutDirection = new THREE.Vector3();

      calloutDirection.subVectors(endPos, startPos).normalize();
      var callout = new THREE.ArrowHelper(calloutDirection, startPos, startPos.distanceTo(endPos), itemData.Attribute.style.lncolor, 2, 1);
      callout.userData = userData;
      parent.add(callout);
    }
    return false;
  }

  public calcConnectorCoord(annotation: any, section, parent: THREE.Object3D) {

    function getBottomPoint(refObj) {
      switch (refObj.ObjectDerivedType) {
        case "StandardShelf":
          return refObj.Fixture.Thickness + 1;
        default:
          return refObj.Dimension.Height;
      }
    }

    let coord = { "x1": 0, "y1": 0, "x2": 0, "y2": 0, "noCallOut": false };   // Cord will hold x and y position in relation to top left corner as DOM needs it. For SVG this is converted back to from bottom.

    // Y2 should be based on calloutLocation when available. Else use position location.
    let calloutLocation = annotation.Attribute.calloutLocation;
    let calloutAvailable = true;
    if (!calloutLocation) {
      const refObj = this.sharedService.getObject(annotation.$belongsToID, section.$id);

      coord.noCallOut = !this.isCalloutRequired(refObj, annotation);

      const refObjParent = refObj ? this.sharedService.getParentObject(refObj, section.$id) : null;
      if (!refObj || (refObjParent && refObjParent.ObjectDerivedType == 'ShoppingCart') || (Utils.checkIfFixture(refObj) && refObj.IDPOGObject == null && refObjParent.Children.indexOf(refObj) == -1)) {
        annotation.status = 'deleted'; return;
      } // If the reference object is not present its as good as the annoation being deleted.
      let refX = (refObj.ObjectDerivedType != 'Section') ? refObj.getXPosToPog() + refObj.Dimension.Width / 2 : annotation.left();
      let refY = (refObj.ObjectDerivedType != 'Section') ? refObj.getTopYPosToPog() : 0;
      let refZ = (refObj.ObjectDerivedType != 'Section') ? refObj.getZPosToPog() + refObj.Dimension.Depth : ((annotation.Attribute.location.locZ) ? annotation.Attribute.location.locZ : section.Dimension.Depth);
      refZ = (refObj.ObjectDerivedType == 'Modular') ? refObj.getZPosToPog() : refZ;
      refZ = (refObjParent && refObjParent.Rotation && refObjParent.Rotation.X < 0 && annotation.Attribute.location.locZ) ? annotation.Attribute.location.locZ : refZ;
      refZ = (refObj.Rotation && refObj.Rotation.X < 0 && annotation.Attribute.location.locZ) ? annotation.Attribute.location.locZ : refZ;
      calloutAvailable = false;
      calloutLocation = {};
      var lowest = 0;
      if (parent && refObjParent && (refObjParent.ObjectDerivedType == AppConstantSpace.BASKETOBJ || refObjParent.ObjectDerivedType == AppConstantSpace.COFFINCASEOBJ)) {
        const threeDObj = parent.getObjectByName(refObj.$id);
        //var pos = threeDObj.getWorldPosition(new THREE.Vector3( 0, 0, 0 ));
        const bb = new THREE.Box3().setFromObject(threeDObj);
        calloutLocation.locZ = bb.max.z;
        calloutLocation.locY = bb.max.y;
        lowest = bb.max.y - bb.min.y;
      } else {
        calloutLocation.locY = section.Dimension.Height - refY;
        calloutLocation.locZ = refZ;
        lowest = getBottomPoint(refObj);
      }
      calloutLocation.locX = refX;

    }

    coord.x2 = calloutLocation.locX;
    coord.y2 = section.Dimension.Height - calloutLocation.locY;
    coord['z2'] = calloutLocation.locZ;

    //check if the annotation is on top, left, right, bottom of the pog and accordingly calculate x1, y1.
    // if on top x1 = mid of width, y1 = bottom of annotatin.
    // if on right x1 = left, y1 = mid of height
    // if on left x1 = right, y1 = mid of height
    // if on bottom x1 = mid of width, y1 = top of annotation.
    let position = "";
    if ((annotation.top() > section.Dimension.Height) || (annotation.bottom() > calloutLocation.locY)) {
      position = "top";
    } else if ((annotation.top() < 0) || (annotation.top() < calloutLocation.locY)) {
      if (!calloutAvailable) coord.y2 += lowest; //refObj.Dimension.Height;
      position = "bottom";
    } else if ((annotation.left() > section.Dimension.Width) || (annotation.right() > calloutLocation.locX)) {
      position = "right";
    } else if ((annotation.left() < 0) || (annotation.right() < calloutLocation.locX)) {
      position = "left"
    } else {
      position = "top"
    }

    switch (position) {
      case "bottom":
      case "top":
        // No break after top ensures that code moves over to bottom case.
        if (position == "bottom") {
          coord.y1 = -annotation.Attribute.location.height;
        }
        coord.x1 = annotation.left() + (annotation.Attribute.location.width / 2);
        coord.y1 += section.Dimension.Height - annotation.bottom();
        break;

      case "left":
      case "right":
        if (position == "left") {
          coord.x1 = annotation.Attribute.location.width;
        }
        coord.x1 += annotation.left();
        coord.y1 = section.Dimension.Height - annotation.top() + (annotation.Attribute.location.height / 2);
        break;
    }
    coord['z1'] = coord['z2'] + .1; //(annotation.Attribute.location.locZ) ? annotation.Attribute.location.locZ : section.Dimension.Depth;

    return coord;
  }

  public isCalloutRequired(refObj, annotation): boolean {
    let AppSettingsSvc = this.planogramStore.appSettings;
    if (annotation.LkExtensionType == AnnotationType.IMAGE_POP) {
      return false;
    }

    if (refObj.ObjectDerivedType == 'Section' || (!annotation.Attribute.callout)
      || (!AppSettingsSvc.fixtCallOutOff && refObj.ObjectDerivedType != 'Position')
      || (!AppSettingsSvc.posCallOutOff && refObj.ObjectDerivedType == 'Position')) {
      return false;
    }
    return true;
  }

  private IsValidImageURL(side: DirectionImage) {
    if (!isEmpty(side) && 'Url' in side && side.Url != null && side.Url.length > 4) { return true };
    return false;
  }

  private ThreeDImagesFromFixture(fixture: any, mapOnlyBackground?: boolean) {
    let images: any = {};
    if (mapOnlyBackground) {
      if (this.IsValidImageURL(fixture.BackgroundFrontImage)) { images.front = fixture.BackgroundFrontImage.Url };
      if (this.IsValidImageURL(fixture.BackgroundBackImage)) { images.back = fixture.BackgroundBackImage.Url };
      return images;
    }
    if (this.IsValidImageURL(fixture.FrontImage)) { images.front = fixture.FrontImage.Url };
    if (this.IsValidImageURL(fixture.BackImage)) { images.back = fixture.BackImage.Url };
    if (this.IsValidImageURL(fixture.LeftImage)) { images.left = fixture.LeftImage.Url };
    if (this.IsValidImageURL(fixture.RightImage)) { images.right = fixture.RightImage.Url };
    if (this.IsValidImageURL(fixture.TopImage)) { images.top = fixture.TopImage.Url };
    if (this.IsValidImageURL(fixture.BottomImage)) { images.bottom = fixture.BottomImage.Url };
    return images;
  }

  private ThreeDTileFromFixture(fixture: any, mapOnlyBackground?: boolean) {
    function IsValidTile(side) {
      if (!isEmpty(side) && 'LkDisplayType' in side && side.LkDisplayType != null) { return true };
      return false;
    }
    let Tiles: any = {};
    if (mapOnlyBackground) {
      if (IsValidTile(fixture.BackgroundFrontImage)) { Tiles.front = fixture.BackgroundFrontImage.LkDisplayType };
      if (IsValidTile(fixture.BackgroundBackImage)) { Tiles.back = fixture.BackgroundBackImage.LkDisplayType };
      return Tiles;
    }
    if (IsValidTile(fixture.FrontImage)) { Tiles.front = fixture.FrontImage.LkDisplayType };
    if (IsValidTile(fixture.BackImage)) { Tiles.back = fixture.BackImage.LkDisplayType };
    if (IsValidTile(fixture.LeftImage)) { Tiles.left = fixture.LeftImage.LkDisplayType };
    if (IsValidTile(fixture.RightImage)) { Tiles.right = fixture.RightImage.LkDisplayType };
    if (IsValidTile(fixture.TopImage)) { Tiles.top = fixture.TopImage.LkDisplayType };
    if (IsValidTile(fixture.BottomImage)) { Tiles.bottom = fixture.BottomImage.LkDisplayType };
    return Tiles;
  }

  private ThreeDCreateBoxSkuImageCube(width: number, height: number, depth: number, itemColor: number, Fixture, name: string, options?: any) {    // TODO: @Bala need to define the type for Fixture as per interface
    let cubes = new THREE.Object3D();
    let geometry = new THREE.BoxGeometry(width, height, depth);
    let material = new THREE.MeshPhongMaterial({ color: itemColor });
    let cube = new THREE.Mesh(geometry, material);
    let cubeBox = cube.clone();
    let edges = new THREE.BoxHelper(cube, 0x000000);
    let hideSideList = ((options != undefined) && ("hideSideList" in options)) ? options.hideSideList : null;

    cube.name = name;
    cube.userData = { Mode: "sku" };
    cubes.add(cube);

    cubeBox.name = name;
    cubeBox.userData = { Mode: "box" };
    cubes.add(cubeBox);

    let images = this.ThreeDImagesFromFixture(Fixture);
    //Don't use image if it is in hideSideList
    if ((hideSideList != undefined) && (hideSideList != null)) {
      for (let i = 0; i < hideSideList.length; i++) {
        if (hideSideList[i] in images) {
          images[hideSideList[i]] = "";
        }
      }
    }
    let tile = this.ThreeDTileFromFixture(Fixture);
    let cubeimage = this.ThreeDCreateImageBox(Fixture.FixtureFullPath, width, height, depth, images, itemColor, { Mode: "image" }, true, false, tile, options);
    cubeimage.name = name;
    cubes.add(cubeimage);
    cubes.add(edges);

    cubes.position.x = width / 2;
    cubes.position.y = height / 2;
    cubes.position.z = depth / 2;

    return cubes;
  }

  private ThreeDCreateImageBox(Name: string, Width: number, Height: number, Depth: number, images: any, Color: number, userData: any, Visible: boolean, Transparent: boolean, Tile?: any, options?: any, position?: Position, packageBlock?: any) {
    if ((Tile == undefined) || (Tile == null)) { Tile = { front: 0, back: 0, left: 0, right: 0, top: 0, bottom: 0 } };
    let geometry = new THREE.BoxGeometry(Width, Height, Depth);
    geometry.name = Name;
    let materialOptions = ((options != undefined) && ("material" in options)) ? options.material : null;
    let materialParameters = { color: Color, transparent: Transparent, opacity: 0.5 };
    // Add/overwrite matertialOptions to materialParameters
    for (let parm in materialOptions) { materialParameters[parm] = materialOptions[parm]; }
    let material = new THREE.MeshPhongMaterial(materialParameters);
    const views = ['Right', 'Left', 'Top', 'Bottom', 'Front', 'Back'];
    let index = navigator.userAgent.indexOf("Trident");
    let materials = [];
    if (position) {
      for (let view of views) {
        const viewL = view.toLowerCase();
        const faceAndRotation = this.orientNS.GetImageFaceAndRotation(packageBlock.orientation, false, this.orientNS.View[view]);
        const imageRotation = faceAndRotation.Rotation;
        const face = faceAndRotation.Face;
        let imageUrl = position.getImageURlfromView(face, packageBlock.isUnitCap);
        if (imageUrl && index == -1) {
          let textureRight = this.makeTexture(imageUrl, Tile[viewL], Depth, Height, imageRotation);
          materials.push(new THREE.MeshBasicMaterial({ name: view, map: textureRight, transparent: true }));
        } else {
          materials.push(material);
        }
      }
    } else {
      if ('right' in images && images.right != null && images.right.length > 4 && index == -1) {
        let textureRight = this.makeTexture(images.right, Tile.right, Depth, Height);
        materials.push(new THREE.MeshBasicMaterial({ name: "Right", map: textureRight, transparent: true }));
      } else {
        materials.push(material);
      }
      if ('left' in images && images.left != null && images.left.length > 4 && index == -1) {
        let textureLeft = this.makeTexture(images.left, Tile.left, Depth, Height);
        materials.push(new THREE.MeshBasicMaterial({ name: "Left", map: textureLeft, transparent: true }));
      } else {
        materials.push(material);
      }
      if ('top' in images && images.top != null && images.top.length > 4 && index == -1) {
        let textureTop = this.makeTexture(images.top, Tile.top, Width, Depth);
        materials.push(new THREE.MeshBasicMaterial({ name: "Top", map: textureTop, transparent: true }));
      } else {
        materials.push(material);
      }
      if ('bottom' in images && images.bottom != null && images.bottom.length > 4 && index == -1) {
        let textureBottom = this.makeTexture(images.bottom, Tile.bottom, Width, Depth);
        materials.push(new THREE.MeshBasicMaterial({ name: "Bottom", map: textureBottom, transparent: true }));
      } else {
        materials.push(material);
      }
      if ('front' in images && images.front != null && images.front.length > 4) {
        let textureFront = this.makeTexture(images.front, Tile.front, Width, Height);
        materials.push(new THREE.MeshBasicMaterial({ name: "Front", map: textureFront, transparent: true }));
      } else {
        materials.push(material);
      }
      if ('back' in images && images.back != null && images.back.length > 4 && index == -1) {
        let textureBack = this.makeTexture(images.back, Tile.back, Width, Height);
        materials.push(new THREE.MeshBasicMaterial({ name: "Back", map: textureBack, transparent: true }));
      } else {
        materials.push(material);
      }
    }
    let cube = new THREE.Mesh(geometry, materials);
    cube.name = Name;
    cube.userData = userData;
    cube.visible = Visible;

    return cube;
  }

  private makeTexture(textureFile: string, tile: number, width: number, height: number, rotation?: number) {
    function imageTexture(texture) {
      function resizeImage(image) {
        if (image instanceof HTMLImageElement || image instanceof HTMLCanvasElement || image instanceof ImageBitmap) {
          let canvas = <HTMLCanvasElement>document.createElementNS('http://www.w3.org/1999/xhtml', 'canvas');
          canvas['width'] = ThreeMath.ceilPowerOfTwo(image.width);
          canvas['height'] = ThreeMath.ceilPowerOfTwo(image.height);
          let context = canvas.getContext('2d');
          context.drawImage(image, 0, 0, canvas['width'], canvas['height']);
          canvas['imgHeight'] = image.height;
          canvas['imgWidth'] = image.width;
          return canvas;
        }
        image.imgHeight = image.height;
        image.imgWidth = image.width;
        return image;
      }
      if ((texture.wrapS == THREE.RepeatWrapping) || (texture.wrapT == THREE.RepeatWrapping)) {
        if (!ThreeMath.isPowerOfTwo(texture.image.width) || !ThreeMath.isPowerOfTwo(texture.image.height)) {
          texture.image = resizeImage(texture.image);
        } else {
          texture.image.imgHeight = texture.image.height;
          texture.image.imgWidth = texture.image.width;
        }
      }
      if (texture.wrapS == THREE.RepeatWrapping) {
        if ((texture.repeat.x > 1) && (texture.repeat.y > 1)) {
          let tRatio = texture.repeat.y / texture.repeat.x;
          let newHeight = tRatio * texture.image.imgWidth;
          let repeat = texture.image.imgHeight / newHeight;
          texture.repeat.set(repeat, 1);
        }
      }
      if (texture.wrapT == THREE.RepeatWrapping) {
        if ((texture.repeat.x > 1) && (texture.repeat.y > 1)) {
          let tRatio = texture.repeat.x / texture.repeat.y;
          let newHeight = tRatio * texture.image.imgHeight;
          let repeat = texture.image.imgWidth / newHeight;
          texture.repeat.set(1, repeat);
        }
      }
    }
    let loader = new THREE.TextureLoader();
    loader.setCrossOrigin('');
    let texture = loader.load(textureFile,
      function (texture) {
        imageTexture(texture);
      }, undefined,// onError callback
      function (err: ErrorEvent) {
        const image = document.createElementNS('http://www.w3.org/1999/xhtml', 'img') as HTMLImageElement;
        image.src = '/Areas/ShelfPlanning/ClientApp/assets/images/errors/brokenImage.png';
        texture.image = image;
        imageTexture(texture);
      }
    );
    switch (Number(tile)) {
      case 1:
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        break;
      case 2:
        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        break;
      default:
        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        break;
    }
    if (tile > 0) { texture.repeat.set(width, height); };
    texture.minFilter = THREE.LinearMipMapLinearFilter;
    texture.needsUpdate = true;
    texture.rotation = Utils.degToRad(-rotation || 0);
    texture.center = new THREE.Vector2(0.5, 0.5);
    return texture;
  }

  private ThreeDCreateOnlyImageBox(object: any, name: string, width: number, height: number, depth: number, mapOnlyBackground?: boolean) {
    let images = this.ThreeDImagesFromFixture(object?.Fixture ?? object, mapOnlyBackground);
    let tile = this.ThreeDTileFromFixture(object?.Fixture ?? object, mapOnlyBackground);
    let itemColor = this.color.getIntColor(null, 0xFFFFFF);

    let cube = new THREE.Object3D();
    let cubeimage = this.ThreeDCreateImageBox(name, width, height, depth, images, itemColor, { Mode: "all" }, true, false, tile);
    cubeimage.name = object.name;
    cube.add(cubeimage);

    cube.position.x = width / 2;
    cube.position.y = height / 2;

    cube.name = object.$id + 'imageBox';
    cube.userData = { Type: object.ObjectDerivedType };
    return cube;
  }

  private ThreeDCreateOnlyImagePlane(object: any, width: number, height: number, url: string, tile: number) { // add code to support tile
    let geometry = new THREE.PlaneGeometry(width, height);
    let texture = this.makeTexture(url, tile, width, height)
    const material1 = new THREE.MeshBasicMaterial({ map: texture, side: THREE.FrontSide });

    let plane = new THREE.Mesh(geometry, material1);
    plane.name = object.$id + 'Fg';
    plane.userData = { Mode: "all", Type: object.ObjectDerivedType };
    plane.position.x = width / 2;
    plane.position.y = height / 2;
    return plane;
  }
  private create3DPlaneforLabel(containerInfo, item, label) {
    let labelObj = this.planogramService.getShelfLabelObject(null, item, 'd3', label);
    if (containerInfo.type == AppConstantSpace.STANDARDSHELFOBJ || containerInfo.type == AppConstantSpace.BLOCK_FIXTURE) {
      labelObj.yshift = 0;
    } else {
      labelObj.yshift = -1;
    }
    function MeasureTextByCanvas(txt, fontname, fontsize) {
      let c = document.createElement('canvas');
      let ctx = c.getContext('2d');
      ctx.font = fontsize + 'px ' + fontname;
      let length = ctx.measureText(txt).width;
      if (parseFloat(ctx.font) != fontsize) { length = length * fontsize / parseFloat(ctx.font); }
      //delete ctx;
      return length;
    }
    let textMeasureWidth = MeasureTextByCanvas(labelObj.text, labelObj.fontfamily, labelObj.fontsize / 8);
    let textMeasureHeight = labelObj.fontsize / 8;
    let geometry = new THREE.PlaneGeometry(textMeasureWidth, textMeasureHeight, 32);
    let can = document.createElement('canvas');
    can.width = this.planogramService.convertToPixel(textMeasureWidth, item.$sectionID) * 4;
    can.height = this.planogramService.convertToPixel(textMeasureHeight, item.$sectionID) * 4;
    can.style.width = can.width + 'px';
    can.style.height = can.height + 'px';
    let ctx = can.getContext('2d');
    ctx.beginPath();
    ctx.fillStyle = labelObj.backgroundcolor;
    ctx.rect(0, 0, can.width, can.height);
    ctx.fill();
    let fontSize = this.planogramService.convertToPixel(labelObj.fontsize / 8, item.$sectionID) * 4;

    ctx.font = '' + fontSize + 'px ' + labelObj.fontfamily;
    ctx.fillStyle = labelObj.fontcolor;

    ctx.fillText(labelObj.text, 0, fontSize * .87);
    let texture = new THREE.Texture(can);
    texture.minFilter = THREE.LinearMipMapLinearFilter;
    texture.needsUpdate = true;
    let material = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide });
    let userData = { Label: "fixture" };
    let plane = new THREE.Mesh(geometry, material);//for Label1
    plane.userData = userData;
    if (containerInfo.type == AppConstantSpace.CROSSBAROBJ && labelObj.crossLabelDisplay == 'Above') {
      containerInfo.x = 0.25;
      containerInfo.y = containerInfo.height;
    } else if(label==1) {
      containerInfo.x = 0.25;
      containerInfo.y = textMeasureHeight * labelObj.yshift;
    }
    else if(label==2) {
      containerInfo.x = containerInfo.width - textMeasureWidth - 0.25;;
      containerInfo.y = textMeasureHeight * labelObj.yshift;
    }
    plane.position.x = textMeasureWidth / 2;
    plane.position.y = textMeasureHeight / 2;
    plane.position.z = 0.6;
    plane.position.x += containerInfo.x;
    plane.position.y += containerInfo.y;
    if (containerInfo.type == AppConstantSpace.COFFINCASEOBJ || containerInfo.type == AppConstantSpace.BASKETOBJ || containerInfo.type == AppConstantSpace.STANDARDSHELFOBJ || containerInfo.type == AppConstantSpace.BLOCK_FIXTURE) {
      plane.position.z += item.Dimension.Depth;
    }
    return plane;
  }

  private create3DLabel(item: any, container: THREE.Object3D) {
    if (!this.planogramStore.appSettings.shelfLabelOn) {
      return;
    }
    let containerInfo = {
      height: item.Dimension.Height,
      width: item.Dimension.Width,
      depth: item.Dimension.Depth,
      x: 0,
      y: 0,
      z: 0,
      type: item.ObjectDerivedType
    };
    if (this.planogramService.labelFixtEnabled[0] && BaseCommon.getCurrentEnableFixture(item, 1, this.planogramService.labelFixtItem)) {
      container.add(this.create3DPlaneforLabel(containerInfo, item, LabelNumber.LABEL1));
    }
    if (this.planogramService.labelFixtEnabled[1] && BaseCommon.getCurrentEnableFixture(item, 2, this.planogramService.labelFixtItem)) {
      container.add(this.create3DPlaneforLabel(containerInfo, item, LabelNumber.LABEL2));
    }
  }

  public flipHeightDepth(parentItemData: ObjectListItem, considerDisplayViewsFlag: boolean): boolean {
    if (
        parentItemData?.ObjectDerivedType == AppConstantSpace.BASKETOBJ ||
        parentItemData?.ObjectDerivedType == AppConstantSpace.COFFINCASEOBJ
    ) {
        return !(this.planogramStore.appSettings.CONSIDER_DISPLAY_VIEW_ONLY
            ? parentItemData.Fixture.DisplayViews
            : (considerDisplayViewsFlag
                ? parentItemData.Fixture.DisplayViews
                : (this.sharedService.getObject(parentItemData.$sectionID, parentItemData.$sectionID) as Section).containsOnlyCoffinCaseFamily()));
    } else {
        return false;
    }
}
  public createLabelCustomized(itemData: any, labelFields, className, params, considerDisplayViewsFlag, fromShoppingCart,label?, labelNo?:LabelNumber): { svgHTML: string, svgTextObject: svgTextObject } | '' {
    let ht = itemData.linearHeight();
    let AppSettingsSvc = this.planogramStore.appSettings;
    let parentItemData = this.sharedService.getObject(itemData.$idParent, itemData.$sectionID);
    const flipHeightDepth = this.flipHeightDepth(parentItemData, considerDisplayViewsFlag);
    if ((parentItemData?.ObjectDerivedType == AppConstantSpace.BASKETOBJ || parentItemData?.ObjectDerivedType == AppConstantSpace.COFFINCASEOBJ)) {
      if (AppSettingsSvc.CONSIDER_DISPLAY_VIEW_ONLY) {
        if (!parentItemData.Fixture.DisplayViews) {
          ht = itemData.linearDepth();
          ht = itemData.linearHeight();
        }
      } else {
        if (considerDisplayViewsFlag) {
          if (!parentItemData.Fixture.DisplayViews) {
            ht = itemData.linearDepth();
          } else {
            ht = itemData.linearHeight();
          }
        } else {
          let sectionObj: Section = this.sharedService.getObject(parentItemData.$sectionID, parentItemData.$sectionID) as Section;
          let flag = sectionObj.containsOnlyCoffinCaseFamily();
          if (flag) {
            ht = itemData.linearHeight();
          } else {
            ht = itemData.linearDepth();
          }
        }
      }
    }
    let wd = itemData.linearWidth();
    if (params.type == "whiteSpace" && itemData.Position.attributeObject.WhiteSpacePosition > 0 && itemData.Position.attributeObject.WhiteSpaceWidth > 0) {
      wd = itemData.Position.attributeObject.WhiteSpaceWidth - 0.8;
    }
    if (ht == 0 || wd == 0 || Utils.isNullOrEmpty(ht) || Utils.isNullOrEmpty(wd)) {
      return '';
    }

    //only positions the group according to alignment
    //for now bottom left
    ht = fromShoppingCart ? itemData.Position.ProductPackage.Height : ht;
    wd = fromShoppingCart ? itemData.Position.ProductPackage.Width : wd;
    if (fromShoppingCart) {
      switch (this.orientationService.ImageViews[itemData.Position.IDOrientation][1]) {
        case 0:
        case 180:
          wd = itemData.Position.ProductPackage.Width;
          ht = itemData.Position.ProductPackage.Height;

          break;
        case 90:
        case 270:
          wd = itemData.Position.ProductPackage.Height;
          ht = itemData.Position.ProductPackage.Width;
          break;
      }
    }

    let containerInfo = {
      height: ht,
      width: wd,
      x: 0,
      y: 0,
    };
 if(this.labelFieldObj1 == undefined || this.labelFieldObj2 == undefined){
  const currentLabel1 = this.planogramService.labelItem['POSITION_LABEL']['LABEL_1'];
    const currentLabel2 = this.planogramService.labelItem['POSITION_LABEL']['LABEL_2'];
    this.labelFieldObj1 = itemData.getLabelCustomizedObject({}, this.planogramService.labelField1,currentLabel1);
   this.labelFieldObj2 = itemData.getLabelCustomizedObject({}, this.planogramService.labelField2,currentLabel2);
 }
    let labelObj = itemData.getLabelCustomizedObject(params, labelFields,label);

    return this.createGroup(labelObj, className, containerInfo, fromShoppingCart,itemData,flipHeightDepth,label,labelNo);

  }

  public createGroup(labelObj: LabelCustomizedObject, className: string, containerInfo, fromShoppingCart: boolean,Position,flipHeightDepth:boolean,label, labelNo: LabelNumber): { svgHTML: string, svgTextObject: svgTextObject } {
    let fontScale = fromShoppingCart ? 1 : null;
    let availWidth, availHeight, rotateDeg = 0, rotateAtX = 0, rotateAtY = 0, translateX = 0, translateY = 0, vertical = false;
    switch (Number(labelObj.orientation)) {
      case -1:
        //best fit
        if (containerInfo.width > containerInfo.height) {
          availWidth = containerInfo.width;
          availHeight = containerInfo.height;
          rotateDeg = 0;
        } else {
          availWidth = containerInfo.height;
          availHeight = containerInfo.width;
          rotateDeg = 90;
        }
        break;
      case 1:
        //vertical
        availWidth = containerInfo.height;
        availHeight = containerInfo.width;
        rotateDeg = 90;
        break;
      case 0:
        //horizontal
        availWidth = containerInfo.width;
        availHeight = containerInfo.height;
        rotateDeg = 0;
        break;

      default:
        //best fit
        if (containerInfo.width > containerInfo.height) {
          availWidth = containerInfo.width;
          availHeight = containerInfo.height;
          rotateDeg = 0;
        } else {
          availWidth = containerInfo.height;
          availHeight = containerInfo.width;
          rotateDeg = 90;
        }
        break;
    }

    let bckColorId = 'customlabelbackgroundcolor'+labelNo+'';//'backgroundcolor-' + itemData.$id;
    let borderId = 'customLabelBorder'+ labelNo +'';

    let svgGHTML: string = '';
    let svgTextObject;
    if(this.labelsCommonService.checkLabelsShrinkFitStatus(this.labelFieldObj1,this.labelFieldObj2)){
      labelObj.xAlignment = this.labelsCommonService.getXAlignForShrinkFit(labelNo,labelObj,this.labelFieldObj1,this.labelFieldObj2,this);
    }
    if (!label.STRECH_TO_FACING && !fromShoppingCart) {//set true for stretchto facing condition
      let yOffset: number = 0;
      let xOffset: number = 0;
      let layovery: number = 0;
      let xAlign: number = rotateDeg == 90 ? 2 - labelObj.yAlignment : labelObj.xAlignment;
      let yAlign: number = rotateDeg == 90 ? 2 - labelObj.xAlignment : labelObj.yAlignment;
      let count:number= 0;
      let counterValue: number;
      let xPosArray=[];
      let yPosArray = [];
      let filteredPackageBlocks = Position.$packageBlocks?.filter(d => !d.hasOwnProperty('layoverUnder'));
      for (let packageBlock of filteredPackageBlocks) {
          let dimensions = {};
          if (packageBlock.isUnitCap) {
            dimensions = { Height: Position.unitDimensions.unitHeight, Width: Position.unitDimensions.unitWidth, Depth: Position.unitDimensions.unitDepth };
          } else {
            // Note: Need to get dimension based on package block orientation for layovers
            dimensions = this.GetDimensions(packageBlock.orientation, false, this.orientationService.View.Front, Position.Position.ProductPackage.Width, Position.Position.ProductPackage.Height, Position.Position.ProductPackage.Depth);
            dimensions['Width'] = dimensions['Width'] + Position.getShrinkWidth();
            dimensions['Height'] = dimensions['Height'] + Position.getShrinkHeight(false, false, packageBlock.layoverUnder, !packageBlock.layoverUnder);
            dimensions['Depth'] = dimensions['Depth'] + Position.getShrinkDepth(false, false, packageBlock.layoverUnder, !packageBlock.layoverUnder);
          }
          availWidth = dimensions['Width']; //+ Position.getSKUGap(true, dimensions['Width']);
          availHeight = flipHeightDepth ? dimensions['Depth'] : dimensions['Height'];
          let swapWidth = rotateDeg == 90 ? availHeight : availWidth;
          let swapHeight =  rotateDeg == 90 ? availWidth :availHeight;
           svgTextObject  = this.createText(labelObj, swapWidth, swapHeight, bckColorId,borderId, fontScale, label, labelNo, Position);
          svgTextObject.rotateDeg = rotateDeg;
          this.labelFieldDetails[labelNo].yAlign = yAlign;
          yAlign =  this.labelsCommonService.checkForHorizontalYalign(yAlign,swapHeight,labelObj,this.labelFieldDetails,this,this.labelFieldObj1,this.labelFieldObj2,Position,labelNo)
          let high = flipHeightDepth ? packageBlock.deep : packageBlock.high;
          const packageBlockWide = rotateDeg == 90 ? high : packageBlock.wide;
          high = rotateDeg == 90 ? packageBlock.wide : high;
          for (let h = 0; h < high; h++) {
              for (let w = 0; w < packageBlockWide; w++) {
                  switch (xAlign) {
                      case 0: //Left
                          xOffset = this.strokeWidth;
                          break;
                      case 1: //Center
                          xOffset = ((swapWidth - svgTextObject.width) / 2) - this.strokeWidth; //stroke-width value is 0.1;
                          break;
                      case 2: //Right
                          xOffset = swapWidth - svgTextObject.width - ((labelObj.fontStyle == 'bold' ? this.strokeWidth * 4 : this.strokeWidth * 2) + this.strokeWidth / 2); // strokewidth/2 is nothing but dx value
                          break;
                  }
                  switch (yAlign) {
                      case 0: //Top
                          yOffset = swapHeight - svgTextObject.height - 0.25;
                          break;
                      case 1: //Middle
                          yOffset = (swapHeight - svgTextObject.height) / 2;
                          break;
                      case 2: //Bottom
                          yOffset = 0.25;
                          break;
                  }
                  yOffset = yOffset + swapHeight * h ;
                  xOffset = xOffset + swapWidth * w;
                  counterValue = count++;
                  //svgGHTML += `<g class="${className}" transform="translate(${xOffset},${yOffset}) rotate(${rotateDeg}) scale(1, -1)">${svgTextObject.textSVG}</g>`;
                  let xPos = (rotateDeg == 90) ? yOffset : xOffset;
                  let yPos = (rotateDeg == 90) ? xOffset : yOffset + svgTextObject.height;

                  xPosArray.push(xPos);
                  yPosArray.push(yPos);
                  svgTextObject['xPos'] = xPos;
                  svgTextObject['yPos'] = yPos;
                  svgTextObject["xPosArray"] = xPosArray;
                  svgTextObject["yPosArray"] = yPosArray;
                if (svgTextObject.textSVG) {
                  svgGHTML += '<g class="' + className + '" transform="translate(' + xPos + ',' + yPos + ') rotate(' + rotateDeg + ') scale(1, 1)" >' + svgTextObject.textSVG + '</g>'
                }
              }
          }
         // layovery = availHeight * packageBlock.high;
      }
  }else{
    svgTextObject = this.createText(labelObj, availWidth, availHeight, bckColorId,borderId, fontScale, label, labelNo, Position);
    svgTextObject['rotateDeg'] = rotateDeg;
    let yOffset;
    let xOffset;
    let xAlign, yAlign;
    xAlign = (rotateDeg == 90) ? 2 - labelObj.yAlignment : labelObj.xAlignment;
    yAlign = (rotateDeg == 90) ? 2 - labelObj.xAlignment : labelObj.yAlignment;
    this.labelFieldDetails[labelNo].yAlign = yAlign;
    yAlign = this.labelsCommonService.checkForHorizontalYalign(yAlign,availHeight,labelObj,this.labelFieldDetails,this,this.labelFieldObj1,this.labelFieldObj2,Position,labelNo)
    switch (xAlign) {
      case 0: //Left
        xOffset = this.strokeWidth;
        break;
      case 1: //Center
        xOffset = ((availWidth - svgTextObject.width) / 2) - this.strokeWidth;
        break;
      case 2: //Right
        xOffset = availWidth - svgTextObject.width - ((labelObj.fontStyle == 'bold' ? this.strokeWidth * 4 : this.strokeWidth * 2) + this.strokeWidth / 2);
        break;
    }
    switch (yAlign) {
      case 0: //Top
        yOffset = availHeight - svgTextObject.height - 0.25;
        break;
      case 1: //Middle
        yOffset = (availHeight - svgTextObject.height) / 2;
        break;
      case 2: //Bottom
        yOffset = 0.25;
        break;
    }
    let xPos = (rotateDeg == 90) ? yOffset : xOffset;
    let yPos = (rotateDeg == 90) ? xOffset : svgTextObject.height + yOffset;
    svgTextObject['xPos'] = xPos;
    svgTextObject['yPos'] = yPos;
     svgGHTML = '<g class="' + className + '" transform="translate(' + xPos + ',' + yPos + ') rotate(' + rotateDeg + ') scale(1, 1)" >' + svgTextObject.textSVG + '</g>'
  }
    return { svgHTML: svgGHTML, svgTextObject: svgTextObject };
  }

  public createTextForWordWrapOff(labelObj: LabelCustomizedObject, availWidth: number, availHeight: number, patternID: string, borderId:string,fontScale: number, labelNo:LabelNumber, position: any) :svgTextObject{
    //cusotmized
    let fontStyleData :string;
    let labelFontSize = fontScale ? (fontScale * labelObj.fontsize) : labelObj.fontsize;
    const permittedWidth = availWidth - (5 * availWidth) / 100;
    const permittedFontSize = labelFontSize / 8;
    const dx = this.strokeWidth / 2;
    let lines = labelObj.text.trim().split(/[\n\r]+/);
    let text = lines.join('')?.trim();
    const whiteSpaceTransform = labelObj.type === AppConstantSpace.WHITESPACE ? 'transform:translate(0.45px,0.05px);' : '';
    const lineDY = permittedFontSize * 1.25;
    let svgTextHTML = '';
    fontStyleData=labelObj.fontStyle=='bold'?`font-weight:${labelObj.fontStyle};`:(labelObj.fontStyle=='italic'?`font-style:${labelObj.fontStyle};`:'');
    let width, metricsWidth;
    width = metricsWidth = UtilsSVG.getWidthOfTextByCanvas(text, labelObj.fontfamily, permittedFontSize) ;
    if (width > permittedWidth) {
      let test = text;
      while (metricsWidth > permittedWidth) {
        // Determine how much of the word will fit
        test = test.substring(0, test.length - 1);
        metricsWidth = UtilsSVG.getWidthOfTextByCanvas(test, labelObj.fontfamily, permittedFontSize);
      }
      if (test.length < 4) {
        let labelFieldsSelected = labelNo == 1 ? this.planogramService.labelField1 : this.planogramService.labelField2;
        if (labelFieldsSelected.some(f => f === 'Position.PositionNo')) {
          if (labelNo == 1) {
            const currentLabel1 = this.planogramService.labelItem['POSITION_LABEL']['LABEL_1'];
            lines = position.getLabelCustomizedObject({}, ['Position.PositionNo'], currentLabel1)['text'].trim().split(/[\n\r]+/);
          } else {
            const currentLabel2 = this.planogramService.labelItem['POSITION_LABEL']['LABEL_2'];
            lines = position.getLabelCustomizedObject({}, ['Position.PositionNo'], currentLabel2)['text'].trim().split(/[\n\r]+/);
          }
          lines.unshift('#');
          text = lines.join('')?.trim();
          width = UtilsSVG.getWidthOfTextByCanvas(text, labelObj.fontfamily, permittedFontSize);
        } else {
          text = '';
        }
      }
    }

    if (text) {
      const whiteSpaceTransform = labelObj.type === AppConstantSpace.WHITESPACE ? 'transform:translate(0.45px,0.05px);' : '';
      svgTextHTML = `<text style="-webkit-font-smoothing: none;text-rendering:geometricPrecision;${whiteSpaceTransform}${fontStyleData}font-family:${labelObj.fontfamily};font-size:${permittedFontSize}px;fill:${labelObj.fontcolor};text-anchor:start;opacity:${labelObj.opacity}">`;
      svgTextHTML += `<tspan  x="${dx}" dy="${permittedFontSize * 1}">` + Utils.replacedHTMLEntityString(text) + `</tspan>`;
      svgTextHTML += `</text>`;

      let bgColor = this.planogramService.labelItem['POSITION_LABEL']["LABEL_" + labelNo]["BACKGROUND_COLOR"];
      let strokeColor = this.planogramService.labelItem['POSITION_LABEL']["LABEL_" + labelNo]["STROKE_COLOR"];

      let rectWidth = width + (labelObj.fontStyle == 'bold' ? this.strokeWidth * 4 : this.strokeWidth * 2);

      svgTextHTML = `<rect width="${rectWidth}" height="${lineDY}" fill="${bgColor}" stroke-width="${this.strokeWidth}" stroke="${strokeColor}" />` + svgTextHTML;
    }
    return { textSVG: svgTextHTML, height: lineDY, width: permittedWidth, fontSize: permittedFontSize * 8, labelObj: labelObj, wrappedTextArr: lines, savePermittedFontSize: permittedFontSize, lineDY: lineDY };
}
  public createText(labelObj: LabelCustomizedObject, availWidthIn: number, availHeight: number, patternID: string,borderId:string, fontScale: number, label, labelNo: LabelNumber, position: any): svgTextObject {
    let availWidth = (availWidthIn <= 0) ? 0.01 : availWidthIn;
    let labelFontSize = fontScale ? (fontScale * labelObj.fontsize) : labelObj.fontsize;
    let permittedFontSize = (labelFontSize / 8);
     let permittedWidth;
        let permittedHeight;
        let permittedHeightnewValue;
        let permittedWidthNewValue;
    if (this.labelsCommonService.checkLabelsShrinkFitStatus(this.labelFieldObj1,this.labelFieldObj2)) {
      // const permittedWidth = this.overlapOccured && labelObj.orientation == 1? this.labelFieldDetails[label].height - (5 * this.labelFieldDetails[label].height) / 100:availWidth - (5 * availWidth) / 100;
      if (this.bothDifferentOrientation?.status && this.bothDifferentOrientation.labelHorizontal == labelNo) {
        permittedWidthNewValue = this.labelFieldDetails[labelNo].permittedWidth
      } else if (this.bothHorizontalOrientation) {
        permittedWidthNewValue = this.labelFieldDetails[labelNo].width;
      } else {
        permittedWidthNewValue = availWidth - (5 * availWidth) / 100
      }
      permittedWidth = permittedWidthNewValue;
      if (this.overlapOccured) {
        if (this.bothDifferentOrientation?.status && this.bothDifferentOrientation.labelHorizontal == labelNo) {
          permittedHeightnewValue = this.labelFieldDetails[labelNo].permittedHeight;
        } else if (this.bothDifferentOrientation?.status && this.bothDifferentOrientation.labelHorizontal != labelNo) {
          permittedHeightnewValue = this.labelFieldDetails[labelNo].permittedWidth
        } else {
          permittedHeightnewValue = this.labelFieldDetails[labelNo].height - (5 * this.labelFieldDetails[labelNo].height) / 100
        }
      }
      permittedHeight = this.overlapOccured ? permittedHeightnewValue : this.bothVerticelOrientation ? this.labelFieldDetails[labelNo].width - (5 * this.labelFieldDetails[labelNo].width) / 100 : availHeight - (5 * availHeight) / 100;//this.overlapOccured ?  this.labelFieldDetails[label].permittedHeight/2:availHeight - (5 * availHeight) / 100;
    } else {
      permittedWidth = availWidth - (5 * availWidth) / 100;
      // Refered in old code, this is the right formulae to calculate permitted height
      permittedHeight = availHeight - (5 * availHeight) / 100;
    }

    this.labelFieldDetails[labelNo] = {
      availWidth :availWidth,
      availHeight:availHeight,
      permittedFontSize:labelObj.fontsize / 8,
      shrinkToFit:labelObj.shrinkToFit,
      permittedWidth:permittedWidth,
      permittedHeight:permittedHeight,
      text: labelObj.text,
      fontsize: labelObj.fontsize,
      fontfamily: labelObj.fontfamily,
      calcMechanism: labelObj.calcMechanism,
      svgHTML: '',
      stretchToFacing: labelObj.stretchToFacing
  }
    let midPoint = availWidth / 2;
    // let rowNum = null;
    // let wrappedTextArr = [];
    // let count = 0;
    // let svgTextHTML = '';
    // let oldSvgTextHTML = '';
    // let lineDY;
    // let maxLineWidth = 0;
    // let fontStyleData:string;
    function rtrim(str) {
      return str.replace(/\s+$/, "");
    }
    if(!label.WORD_WRAP){//wraptext-off set to true
      return this.createTextForWordWrapOff(labelObj,availWidth,permittedHeight,patternID,borderId,fontScale, labelNo, position);
    }else{
      let wordWrapObj = this.createTextForWordWrap(permittedHeight, permittedWidth, labelFontSize, labelObj)

      if(wordWrapObj.wrappedTextArr.length > 1 && wordWrapObj.wrappedTextArr.every(t => t.trim().length < 4) && labelNo) {
        let labelFieldsSelected = labelNo == 1 ? this.planogramService.labelField1 : this.planogramService.labelField2;
        if (labelFieldsSelected.some(f => f === 'Position.PositionNo')) {
          if (labelNo == 1) {
            const currentLabel1 = this.planogramService.labelItem['POSITION_LABEL']['LABEL_1'];
            labelObj.text = position.getLabelCustomizedObject({}, ['Position.PositionNo'], currentLabel1)['text'];
          } else {
            const currentLabel2 = this.planogramService.labelItem['POSITION_LABEL']['LABEL_2'];
            labelObj.text = position.getLabelCustomizedObject({}, ['Position.PositionNo'], currentLabel2)['text'];
          }
          labelObj.text = '#'+labelObj.text;
          wordWrapObj = this.createTextForWordWrap(permittedHeight, permittedWidth, labelFontSize, labelObj);
        } else {
          wordWrapObj.svgTspanHTML = wordWrapObj.svgTspanHTML = '';
        }
      }

      if (wordWrapObj.savePermittedFontSize == 0) wordWrapObj.savePermittedFontSize = permittedFontSize;
      if (wordWrapObj.oldSvgTspanHTML == "") wordWrapObj.oldSvgTspanHTML = wordWrapObj.svgTspanHTML;

      let tspanSVG = wordWrapObj.oldSvgTspanHTML || wordWrapObj.svgTspanHTML;
      let finalTextSVG = '';
      if (tspanSVG) {
        $('#d3-basedcalclabel-temp').html('');
        wordWrapObj.rowNum = wordWrapObj.oldRowNum || wordWrapObj.rowNum;
        let rectWidth = wordWrapObj.maxLineWidth + (labelObj.fontStyle == 'bold' ? this.strokeWidth * 4 : this.strokeWidth * 2);
        let fontStyleData=labelObj.fontStyle=='bold'?`font-weight:${labelObj.fontStyle};`:(labelObj.fontStyle=='italic'?`font-style:${labelObj.fontStyle};`:'');
        const whiteSpaceTransform = labelObj.type === AppConstantSpace.WHITESPACE ? 'transform:translate(0.45px,0.05px);' : '';

        let textSVGForLabel = `<text class="svgText" style="-webkit-font-smoothing: none;text-rendering:geometricPrecision;${whiteSpaceTransform}
          font-family:${labelObj.fontfamily};${fontStyleData};font-size:${wordWrapObj.permittedFontSize}px;text-anchor:start;opacity:${labelObj.opacity};fill:${labelObj.fontcolor};">${tspanSVG}</text>`;

        let x = 0;
        let y = 0;
        let polygonCoords = `${x},${y},`;
        for (let i = 0; i < wordWrapObj.wrappedTextArr.length; i++) {
          x = UtilsSVG.getWidthOfTextByCanvas(wordWrapObj.wrappedTextArr[i].trim(), labelObj.fontfamily, wordWrapObj.permittedFontSize) + (wordWrapObj.permittedFontSize * 0.15);
          polygonCoords += `${x},${y},`;
          y = y + (wordWrapObj.permittedFontSize * 1.25);
          polygonCoords += `${x},${y},`;
        }
        polygonCoords += `0,${y}`;

        let polygonSVG = `<polygon points="${polygonCoords}"  fill="${labelObj.backgroundcolor}" stroke-width="${this.strokeWidth}" stroke="${labelObj.strokecolor}" />`;

        finalTextSVG = `${polygonSVG}${textSVGForLabel}`;
        if (this.labelFieldDetails[labelNo]) {
          //this.labelFieldDetails[label].height = labelObj.orientation ?rectWidth:lineDY * (rowNum + 1);
          //this.labelFieldDetails[label].width = labelObj.orientation ?lineDY * (rowNum + 1):rectWidth;
          this.labelFieldDetails[labelNo].height = labelObj.orientation == 1 || labelObj.orientation == -1 ? rectWidth : wordWrapObj.lineDY * (wordWrapObj.rowNum + 1);
          this.labelFieldDetails[labelNo].width = labelObj.orientation == 1 || labelObj.orientation == -1 ? wordWrapObj.lineDY * (wordWrapObj.rowNum + 1) : rectWidth;
          this.labelFieldDetails[labelNo].permittedHeight = permittedHeight;
          this.labelFieldDetails[labelNo].permittedWidth = permittedWidth;
          this.labelFieldDetails[labelNo].tspanLength = wordWrapObj.wrappedTextArr.length;
          this.labelFieldDetails[labelNo].eachtspanHeight = wordWrapObj.lineDY;
          this.labelFieldDetails[labelNo].orientation = labelObj.orientation;
        }
      }
      return { textSVG: finalTextSVG, height: wordWrapObj.lineDY * (wordWrapObj.rowNum + 1), width: wordWrapObj.maxLineWidth, fontSize: wordWrapObj.savePermittedFontSize * 8, labelObj: labelObj, wrappedTextArr: wordWrapObj.wrappedTextArr, savePermittedFontSize: wordWrapObj.savePermittedFontSize, lineDY: wordWrapObj.lineDY, permittedFontSize: wordWrapObj.permittedFontSize };
    }
  }
  public createTextForWordWrap(permittedHeight: number, permittedWidth: number, labelFontSize: number, labelObj){
    let rowNum = null;
    let wrappedTextArr = [];
    let count = 0;
    let svgTspanHTML = '';
    let oldSvgTspanHTML = '';
    let oldRowNum;
    let lineDY;
    let maxLineWidth = 0;
    let permittedFontSize = (labelFontSize / 8);
    let savePermittedFontSize = 0;
    let diff = 8;
    let pos = 0;
    let oldFontSizeForTextTag = 0;
    let fontSizeForTextTag = 0;
    do {
      let lines = labelObj.text.trim().split(/[\n\r]+/);

      wrappedTextArr = [];
      svgTspanHTML = '';
      lineDY = permittedFontSize * 1.25;
      let calcTextWidthMechanism;
      switch (labelObj.calcMechanism) {
        case 'canvas':
          calcTextWidthMechanism = this.getWidthOfTextByCanvas; break;
        case 'd3':
          calcTextWidthMechanism = this.getWidthOfTextByD3; break;
        default:
          calcTextWidthMechanism = function () { return 0; };
      }
      let test;
      for (let li = 0; li < lines.length; li++) {
        if ((lineDY * (wrappedTextArr.length + 1)) > permittedHeight) {
          break;
        }
        let words = lines[li].split(' '),
          line = '',
          i,
          metrics_width;
        for (i = 0; i < words.length; i++) {

          if ((lineDY * (wrappedTextArr.length + 1)) > permittedHeight) {
            break;
          }

          test = words[i];
          metrics_width = calcTextWidthMechanism(test, labelObj.fontfamily, permittedFontSize);
          while (metrics_width > permittedWidth) {
            // Determine how much of the word will fit
            test = test.substring(0, test.length - 1);
            metrics_width = calcTextWidthMechanism(test, labelObj.fontfamily, permittedFontSize);
          }
          if (words[i] != test) {
            words.splice(i + 1, 0, words[i].substr(test.length));
            words[i] = test;
          }

          test = line + words[i] + ' ';
          metrics_width = calcTextWidthMechanism(test, labelObj.fontfamily, permittedFontSize);

          if (metrics_width > permittedWidth && i > 0) {
            wrappedTextArr.push(line);
            line = words[i] + ' ';
          }
          else {
            line = test;
          }
        }

        if ((lineDY * (wrappedTextArr.length + 1)) <= permittedHeight) {
          wrappedTextArr.push(line);
        }
      }

      wrappedTextArr = wrappedTextArr.filter(txt => txt.trim());

      rowNum = wrappedTextArr.length - 1;
      fontSizeForTextTag = permittedFontSize;
      //for the wrapping rows
      let dx = this.strokeWidth / 2;
      for (let i = 0; i <= rowNum; i++) {
        maxLineWidth = Math.max(maxLineWidth, calcTextWidthMechanism(wrappedTextArr[i].trim(), labelObj.fontfamily, permittedFontSize));
        let dy = i == 0 ? permittedFontSize * 1 : lineDY;
        svgTspanHTML += `<tspan x="${dx}" dy="${dy}">` + Utils.replacedHTMLEntityString(wrappedTextArr[i].trim()) + `</tspan>`;
      }

      let tooBig: boolean;
      if (wrappedTextArr[rowNum] != undefined && test != undefined) {
        tooBig = wrappedTextArr.join("").replaceAll(" ", "") != lines.join("").replaceAll(" ", "") ||  (wrappedTextArr.length > 1 && wrappedTextArr.every(t => t.trim().length < 4));
        if (count == 0 && !tooBig) {
          oldRowNum = rowNum;
          oldSvgTspanHTML = svgTspanHTML;
          savePermittedFontSize = permittedFontSize;
          oldFontSizeForTextTag = permittedFontSize;
          break;
        }
      }
      else {
        tooBig = true;
      }
      if (!tooBig && permittedFontSize > savePermittedFontSize) {
        oldRowNum = rowNum;
        savePermittedFontSize = permittedFontSize;
        oldFontSizeForTextTag = permittedFontSize;
        oldSvgTspanHTML = svgTspanHTML;

      }
      count++;
      diff = diff / 2;
      pos = (tooBig) ? pos + diff : pos - diff;
      permittedFontSize = (labelFontSize / 8) * Math.pow(Math.E, -pos * Math.LN2 / 3.5);
    } while (labelObj.shrinkToFit && count < 5)
    return {
      permittedFontSize: oldFontSizeForTextTag || fontSizeForTextTag,
      savePermittedFontSize: savePermittedFontSize,
      oldSvgTspanHTML: oldSvgTspanHTML,
      svgTspanHTML: svgTspanHTML,
      maxLineWidth: maxLineWidth,
      lineDY: lineDY,
      rowNum: rowNum,
      oldRowNum: oldRowNum,
      wrappedTextArr: wrappedTextArr
    }
  }
  public getWidthOfTextByCanvas(txt, fontname, fontsize) {
    // Create a dummy canvas (render invisible with css)
    let c = document.createElement('canvas');
    // Get the context of the dummy canvas
    let ctx = c.getContext('2d');
    // Set the context.font to the font that you are using
    ctx.font = fontsize + 'px ' + fontname;
    // Measure the string
    let length = ctx.measureText(txt).width;
    if (parseFloat(ctx.font) != fontsize) { length = length * fontsize / parseFloat(ctx.font) }
    // Return width
    //delete ctx;
    // Return width
    return length;
  }

  public getWidthOfTextByD3(txt, fontname, fontsize) {
    let text = txt;

    let plotWidth = 400;

    let plot = d3.select('#d3-basedcalclabel-temp')
      .insert("svg")
      .attr('width', plotWidth)
      .attr('height', 50);

    plot.append("text")
      .attr("x", plotWidth)
      .attr("y", 28)
      .attr("font-size", fontsize)
      .text(text)

    let text_element = plot.select("text");

    let textWidth = text_element.node().getBBox().width;

    return textWidth;
  }

  //@Sagar: Create tooltip template for 3D with new configuration
  public createTooltipTemplate(object: any, for3D?: boolean): string {
    let wid: number, tpl: string;
    if (object.ObjectDerivedType == AppConstantSpace.STANDARDSHELFOBJ || object.ObjectDerivedType == AppConstantSpace.PEGBOARDOBJ || object.ObjectDerivedType == AppConstantSpace.CROSSBAROBJ || object.ObjectDerivedType == AppConstantSpace.SLOTWALLOBJ || object.ObjectDerivedType == AppConstantSpace.COFFINCASEOBJ || object.ObjectDerivedType == AppConstantSpace.BASKETOBJ || object.ObjectDerivedType == AppConstantSpace.BLOCK_FIXTURE) { // for Shelf
      wid = 325;
    } else if (object.ObjectDerivedType == AppConstantSpace.POSITIONOBJECT) { // for position
      wid = 410;
    } else if (object.ObjectDerivedType == AppConstantSpace.BLOCKOBJECT) { // for block in iAllocate mode
    } else {
      return;
    }
    if (for3D) {
      tpl = `<div style="visibility:visible;position:relative;border-color: rgba(100,100,100,.9);background-color: rgba(100,100,100,.9);color: #fff;"><div>`; //width:' + wid + 'px;
    } else if (for3D == undefined) {
      tpl = `<div style="visibility:visible;position:relative;"><div>`; //width:' + wid + 'px;
    }

    this.data = this.planogramService.getPlanogramToolTipData(object);
    tpl += `<table><tbody>`;

    if (object.ObjectDerivedType != AppConstantSpace.POSITIONOBJECT) { // for fixture
      for (const item of this.data) {
        tpl += `<tr style="height:0px;line-height:2px;"><td style = "padding:10px;">${item.keyName}</td > <td style="padding:0px 10px 0px;">:</td> <td style="padding:10px;"> ${item.value != null ? item.value : ''}</td></tr >`;
      }
    } else if (object.ObjectDerivedType == AppConstantSpace.POSITIONOBJECT) {
      let imgsrc = object.Position.ProductPackage.Images.front;
      if (!imgsrc) {
        imgsrc = AppConstantSpace.DEFAULT_PREVIEW_SMALL_IMAGE;
      }
      const imgFallback = `${this.config?.fallbackImageUrl}`;
      tpl += `<tr><td style="padding:20px" rowspan="13"><img src="${imgsrc}" style="max-height:120px;max-width:90px"   onerror="this.src='${imgFallback}'" alt="Washed Out" /></td></tr>`;
      for(const item of this.data) {
        if(item.keyName !== "Image") {
          tpl += `<tr style="height:0px;line-height:2px;"><td style = "padding:10px;">${item.keyName}</td > <td style="padding:0px 10px 0px;">:</td> <td style="padding:10px;">${item.value != null ? item.value : ''}</td></tr>`;
        }
      }
    }
    tpl += `</tbody></table></div></div>`;
    return tpl;
  }

  public getPog3dObjects = (obj): Observable<IApiResponse<Pog3DObjects>> => {
    return this.http.post<IApiResponse<Pog3DObjects>>(
      '/api/pogmigration/GetPog3DObjects', obj
    );
  }

  public get3DFixtureObjects = (data): Observable<IApiResponse<Pog3DObjects[]>> => {
    return this.http.post<IApiResponse<Pog3DObjects[]>>(
      '/api/planogram/Get3DFixtureObjects', data
    );
  }
}

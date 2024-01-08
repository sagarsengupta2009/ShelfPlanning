import { Directive, OnInit, ElementRef, Input, OnChanges, SimpleChanges, OnDestroy, HostListener } from '@angular/core';
import { Subscription } from 'rxjs';
import { isEmpty } from 'lodash';
import * as THREE from 'three';
import { isArray } from 'underscore';
import { AppConstantSpace, Utils, SettingNames as SETTINGS } from 'src/app/shared/constants'
import { Pog3DObjects } from '../../models/sa-dashboard/app-planogram-apis';
import { IApiResponse, PogSettings } from '../../models';
import { BoundingBox, POV } from '../../models/3d-planogram/threed-scene';
import { ThreeOrbitControls } from 'src/assets/plugins/three-orbit-control';
import { ThreeDItemData } from '../../models/3d-planogram/threed-item';
import { ObjectListItem } from '../../services/common/shared/shared.service';
import {
  PlanogramService, PlanogramStoreService, SharedService,
  ThreedPlanogramService, SearchSettingService, ToolTipService,
} from '../../services';


@Directive({
  selector: '[sp3dRender]'
})
export class ThreedRenderDirective implements OnInit, OnChanges, OnDestroy {

  @Input() panalID: string;
  @Input() dataSource: ThreeDItemData   // TODO: @Bala specify the type for data source. ie planogram object.

  public sectionID: string;
  public threedFixtureList: Pog3DObjects[];
  public POV: POV;
  public scene: THREE.Scene;
  public renderer: THREE.WebGLRenderer;
  public camera: THREE.PerspectiveCamera;
  public controls: ThreeOrbitControls;
  public mySetting: PogSettings;
  private isTooltipOn: boolean;
  private subscriptions: Subscription = new Subscription();

  constructor(
    private readonly elementRef: ElementRef,
    private readonly planogramService: PlanogramService,
    private readonly SharedService: SharedService,
    private readonly threedPlanogramService: ThreedPlanogramService,
    private readonly toolTipService: ToolTipService,
    private readonly planogramStore: PlanogramStoreService,
  ) { }

  ngOnInit(): void {

    this.subscriptions.add(this.threedPlanogramService.threedResetZoomChanger.subscribe((result: boolean) => {
      if (result) {
        //let scene = new THREE.Scene();
        let SceneSize = new THREE.Vector3();
        SceneSize.x = this.dataSource.Dimension.Width;
        SceneSize.y = this.dataSource.Dimension.Height;
        SceneSize.z = this.dataSource.Dimension.Depth;

        this.ResetPOV(this.scene, this.camera, this.controls, SceneSize.x, SceneSize.y, SceneSize.z);
      }
    }));

    this.subscriptions.add(this.threedPlanogramService.threedHeightZoomChanger.subscribe((result: boolean) => {
      if (result) {
        this.heightPOV();
      }
    }));

    this.subscriptions.add(this.threedPlanogramService.threedModeChanger.subscribe((result: boolean) => {
      if (result) {
        this.changeDisplayMode();
        this.threedPlanogramService.threedModeChanger.next(false);
      }
    }));

    this.subscriptions.add(this.threedPlanogramService.threedLabelChanger.subscribe((result: boolean) => {
      if (result) {
        this.changeLabelMode();
        this.threedPlanogramService.threedLabelChanger.next(false);
      }
    }));
    this.subscriptions.add(this.threedPlanogramService.threedReRender.subscribe((result: boolean) => {
      if (result) {
        if (this.scene) {
          this.sectionID = this.SharedService.getActiveSectionId();
          let ret: { scene: THREE.Scene, renderer: THREE.WebGLRenderer } = this.pogThreeD(this.dataSource, this.elementRef.nativeElement, this.elementRef.nativeElement);
          this.scene = ret.scene;
          this.renderer = ret.renderer;
        }
      }
    }));
    this.subscriptions.add(this.threedPlanogramService.threedAnnotationChanger.subscribe((result: boolean) => {
      if (result) {
        this.changeAnnotationMode();
        this.threedPlanogramService.threedAnnotationChanger.next(false);
      }
    }));
    if (!this.scene) {
      this.sectionID = this.SharedService.getActiveSectionId();
      let ret: { scene: THREE.Scene, renderer: THREE.WebGLRenderer } = this.pogThreeD(this.dataSource, this.elementRef.nativeElement, this.elementRef.nativeElement);
      this.scene = ret.scene;
      this.renderer = ret.renderer;
    }
    this.subscriptions.add(
      this.SharedService.turnoNOffSub.subscribe((res) => {
          this.isTooltipOn = this.planogramStore.appSettings.turnoff_tooltip;
      }),
  );
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!isEmpty(this.dataSource)) {
      this.sectionID = this.SharedService.getActiveSectionId();
      this.isTooltipOn = this.planogramStore.appSettings.turnoff_tooltip;
      let ret: { scene: THREE.Scene, renderer: THREE.WebGLRenderer } = this.pogThreeD(this.dataSource, this.elementRef.nativeElement, this.elementRef.nativeElement);
      this.scene = ret.scene;
      this.renderer = ret.renderer;
    }
  }

  private tooltipTemplate(child: ObjectListItem): string {
    let from3D = true;
    if (!child) {
      return;
    }
    return this.threedPlanogramService.createTooltipTemplate(child, from3D);
  };

  public changeDisplayMode(): void {
    this.mySetting.mode = (this.mySetting.mode + 1) % 3;
  }

  public changeLabelMode(): void {
    this.planogramService.labelOn = !this.planogramService.labelOn;
    this.mySetting.is3DLabelOn = this.planogramService.labelOn;
  }

  public changeAnnotationMode(): void {
    this.mySetting.isAnnotationView = (this.mySetting.isAnnotationView < 3) ? ++this.mySetting.isAnnotationView : 0;
  }

  private pogThreeD(POG: ThreeDItemData, hostElement: HTMLBodyElement, sizeElement: HTMLBodyElement): { scene: THREE.Scene, renderer: THREE.WebGLRenderer}{
    let oldWidth = sizeElement.clientWidth;
    let oldHeight = sizeElement.clientHeight;
    let empty = true;
    let currentMode = -1; //planogramSettings.rootFlags[scope.sectionID].mode;
    let currentAnnotation = -1;
    let currentLabel = null;
    this.mySetting = this.planogramService.rootFlags[this.sectionID];
    this.mySetting.is3DLabelOn = this.planogramService.labelOn;
    if (this.mySetting.mode === undefined || this.mySetting.mode < 0 || this.mySetting.mode > 2) {
      this.mySetting.mode = 0;
    }

    let scene: THREE.Scene = new THREE.Scene();

    let renderer: THREE.WebGLRenderer = null;

    if (window.WebGLRenderingContext) {
      try {
        renderer = new THREE.WebGLRenderer({ antialias: true });
      }
      catch (err) {
        renderer = null;
      }
    }
    if (renderer == null) {
      hostElement.innerHTML = "<h><b>Device does not support WebGL</b.</h>";
      return null;
      //renderer = new THREE.CanvasRenderer();
    }

    renderer.setClearColor(0xffffff);

    renderer.setSize(sizeElement.clientWidth, sizeElement.clientHeight);
    if (hostElement.children.length > 0) {
      hostElement.removeChild(hostElement.children[0]);
    }
    hostElement.appendChild(renderer.domElement);

    this.createScene(scene, POG, this.mySetting);

    let SceneSize = new THREE.Vector3();
    SceneSize.x = POG.Dimension.Width;
    SceneSize.y = POG.Dimension.Height;
    SceneSize.z = POG.Dimension.Depth;

    let farLimit = Math.max(SceneSize.x, SceneSize.y, SceneSize.z) * 4;
    this.camera = new THREE.PerspectiveCamera(45, sizeElement.clientWidth / sizeElement.clientHeight, 0.1, farLimit);
    this.controls = new ThreeOrbitControls(this.camera, hostElement, scene);
    let raycaster = new THREE.Raycaster();
    let mouse = new THREE.Vector2();
    let intersected = null;
    let timeoutid = 0;


    if (this.isTooltipOn) {
      renderer.domElement.addEventListener('mousemove', (event) => {
        clearTimeout(timeoutid);
        if (intersected != null) {
          intersected = null;
          clearTooltip();
        }
        timeoutid = window.setTimeout(() => {
          if(this.isTooltipOn) {
            on3DTooltip(event);
          }
        }, this.SharedService.tooltipDelayTime);
      }, false);
    }

    renderer.domElement.addEventListener('dblclick', on3DDoubleClick, false);

    let dtag = document.createElement('div');
    dtag.innerHTML = "";
    dtag.className = "k-animation-container";
    dtag.className += ' 3d-container-class';
    hostElement.appendChild(dtag);
    dtag.style.position = "absolute";
    dtag.style.left = '-28000px';
    dtag.style.top = '-28000px';

    function clearTooltip() {
      dtag.style.left = '-28000px';
      dtag.style.top = '-28000px';
      dtag.innerHTML = '';
    }

    this.ResetPOV(scene, this.camera, this.controls, SceneSize.x, SceneSize.y, SceneSize.z);
    this.savePOV();

    var singleView = false;
    var dblclickTime = 0;

    function on3DDoubleClick(event) {
      // If you get another double click with a half second ingore it
      var now = new Date().getTime();
      if ((now - dblclickTime) < 500)
        return;
      dblclickTime = now;
      var x, y;
      if (event.pointerType == "touch") {
        var offset = $(event.target).offset();
        x = event.pointers[0].clientX - offset.left;
        y = event.pointers[0].clientY - offset.top;
      } else {
        x = event.offsetX;
        y = event.offsetY;
      }

      var intersection = findObject(x, y);
      setMode();
      if (!singleView && (intersection != null)) {
        if ((intersection.userData) == undefined || (intersection.userData == null)) {
          intersection.userData = {};
        }
        if (intersection.userData.Type == AppConstantSpace.POSITIONOBJECT) {
          intersection.userData.View = true;

          scene.traverse((child) => {
            if ((child.userData.hasOwnProperty("Mode") == true) || (child.userData.hasOwnProperty("Peg") == true)) {
              var skip = false;
              if ((child.parent.userData.hasOwnProperty("View") == true) && (child.parent.userData.View == true)) {
                skip = true;
              }
              if (!skip) {
                child.visible = false;
              }
            }
            if (child.userData.Label == true) {
              child.visible = false;
            }
          });
          intersection.traverse((child) => { if (child.userData.Label == true) { child.visible = true; } });
          intersection.userData.View = false;
          singleView = true;
        }
      } else {
        singleView = false;
      }

    }

    let findObject = (x, y) => {
      if ((scene == undefined) || (scene == null)) { return null; }

      mouse.x = (x / renderer.domElement.width) * 2 - 1;
      mouse.y = -(y / renderer.domElement.height) * 2 + 1;

      raycaster.setFromCamera(mouse, this.camera);

      var intersection = null;

      var intersections;
      intersections = raycaster.intersectObjects(scene.children, true);

      var intersection = null;
      if (intersections.length > 0) {
        for (var i = 0; i < intersections.length; i++) {
          var parentObject = intersections[i].object;
          while (parentObject.type != "Scene") {
            if ((parentObject.visible == false) && parentObject.userData.hasOwnProperty("Mode")) break;
            if (parentObject.type == "Object3D") {
              if (parentObject.userData.hasOwnProperty("Type")) {
                intersection = parentObject;
                break;
              }
            }
            parentObject = parentObject.parent;
          }
          if (intersection != null) break;
        }
      }
      return intersection;
    }

    let tipTimeoutid = 0;

    function on3DTooltip(event) {
      clearTimeout(tipTimeoutid);
      var intersection = findObject(event.offsetX, event.offsetY);
      if (intersection != null) {
        if (intersected != intersection) {
          intersected = intersection;
          var toolTip = null;
          if (intersected.userData.hasOwnProperty("ToolTip") == true) {
            toolTip = intersected.userData.ToolTip;
            if (toolTip == undefined) {
              toolTip = "";
            }
            if (toolTip.length == 0) {
              intersected = null;
              dtag.style.left = '-28000px';
              dtag.style.top = '-28000px';
            }
            dtag.innerHTML = toolTip;
          }
        }
        if ((intersected != null)) {
          dtag.style.position = "Fixed";
          dtag.style.left = event.offsetX + 'px';
          dtag.style.top = event.offsetY + 20 + 'px'; //- dtag.clientHeight + 'px';
          tipTimeoutid = window.setTimeout(function () { clearTooltip() }, 8000);
        }
      }
      else if (intersected) {
        intersected = null;
        dtag.style.left = '-28000px';
        dtag.style.top = '-28000px';
        dtag.innerHTML = '';
      }
    }

    function panUp(): void {
      this.controls.pan(0, this.controls.keyPanSpeed);
      this.controls.update();
    }

    function panLeft(): void {
      this.controls.pan(this.controls.keyPanSpeed, 0);
      this.controls.update();
    }

    function panDown(): void {
      this.controls.pan(0, - this.controls.keyPanSpeed);
      this.controls.update();
    }

    function panRight(): void {
      this.controls.pan(- this.controls.keyPanSpeed, 0);
      this.controls.update();
    }

    let setMode = (): void => {
      scene.traverse((child) => {
        if (child.userData.hasOwnProperty("Peg")) { child.visible = true; }
        //if (child.userData.hasOwnProperty("Label") == true) { child.visible = true; }
        if (child.userData.hasOwnProperty("Mode") && !(child.userData.Label)) {
          child.visible = false;
          switch (this.mySetting.mode) {
            case 0:
              if (child.userData.Mode === "image" || child.userData.Mode === "all") { child.visible = true }
              break;
            case 1:
              if (child.userData.Mode === "box" || child.userData.Mode === "all") { child.visible = true }
              break;
            case 2:
              if (child.userData.Mode === "sku" || child.userData.Mode === "all") { child.visible = true }
              break;
          }
        }
      });

    }

    let resizeCanvas = () => {

      oldWidth = sizeElement.clientWidth;
      oldHeight = sizeElement.clientHeight;

      this.camera.aspect = oldWidth / oldHeight;
      this.camera.updateProjectionMatrix();

      renderer.setSize(oldWidth, oldHeight);
    }
    let renderCount: number = 0;
    const render = () => {
      if (sizeElement.clientHeight < 100) {
        if (oldHeight > 0) {
          if (!empty) {
            if ((scene != undefined) && (scene !== null)) {
              this.savePOV();
              this.doDispose(scene);
              scene = undefined;
            }
            empty = true;
          }
        }
      } else {
        if (oldHeight == 0) {
          if (empty) {
            if ((scene != undefined) && (scene !== null)) {
              this.savePOV();
              this.doDispose(scene);
              scene = undefined;
            }

            scene = new THREE.Scene();
            this.createScene(scene, POG, this.mySetting);
            setMode();
            currentMode = this.mySetting.mode;
            this.SetAnnotationMode(this.mySetting.isAnnotationView, scene);
            currentAnnotation = this.mySetting.isAnnotationView;
            this.setLabels(this.mySetting.is3DLabelOn, scene);
            currentLabel = this.mySetting.is3DLabelOn;
            this.restorePOV();
            empty = false;
          }
        }

      }
      // Test to see if sizeElement has changed size. Resize events don't work on <div>
      // If this causes some infinite loop in the future we might want to change this to test for a change of more than a certain amount of pixels instead of any change.
      if ((oldWidth != sizeElement.clientWidth) || (oldHeight != sizeElement.clientHeight)) {
        resizeCanvas();
      }

      if (renderCount == 2) {
        this.createScene2(scene, POG, this.mySetting);
        setMode();
        currentMode = this.mySetting.mode;
        singleView = false;
        currentLabel = false;
        this.ResetPOV(scene, this.camera, this.controls, SceneSize.x, SceneSize.y, SceneSize.z);
      }
      renderCount++;
      if (currentMode != this.mySetting.mode) {
        setMode();
        currentMode = this.mySetting.mode;
        singleView = false;
      }

      if (currentAnnotation != this.mySetting.isAnnotationView) {
        this.SetAnnotationMode(this.mySetting.isAnnotationView, scene);
        currentAnnotation = this.mySetting.isAnnotationView;
        singleView = false;
      }

      if (currentLabel != this.mySetting.is3DLabelOn) {
        this.setLabels(this.mySetting.is3DLabelOn, scene);
        currentLabel = this.mySetting.is3DLabelOn;
        singleView = false;
      }

      requestAnimationFrame(render);
      if ((sizeElement.clientWidth == 0) || (sizeElement.clientHeight == 0)) {
        return;
      }
      //        update();
      renderer.render(scene, this.camera);
    }
    render();
    return { scene: scene, renderer: renderer };
  }

  private savePOV(): void {
    this.POV = { positionX: null, positionY: null, positionZ: null, aspect: null, targetX: null, targetY: null, targetZ: null };
    this.POV['positionX'] = this.camera.position.x;
    this.POV['positionY'] = this.camera.position.y;
    this.POV['positionZ'] = this.camera.position.z;
    this.POV['aspect'] = this.camera.aspect;
    this.POV['targetX'] = this.controls.target.x;
    this.POV['targetY'] = this.controls.target.y;
    this.POV['targetZ'] = this.controls.target.z;
  }

  private restorePOV(): void {
    this.camera.position.x = this.POV['positionX'];
    this.camera.position.y = this.POV['positionY'];
    this.camera.position.z = this.POV['positionZ'];
    this.camera.aspect = this.POV['aspect'];
    this.controls.target.x = this.POV['targetX'];
    this.controls.target.y = this.POV['targetY'];
    this.controls.target.z = this.POV['targetZ'];
    this.controls.update();
  }

  private findBestCameraZ(center: THREE.Vector3, camera: THREE.PerspectiveCamera, cameraZ: number, boundingBox: BoundingBox) {
    let startIndex = 1;
    let endIndex = 300;
    const minBBNDC = new THREE.Vector3();
    const maxBBNDC = new THREE.Vector3();
    let returnZ = cameraZ;
    while (startIndex <= endIndex) {
      const middleIndex = Math.floor((startIndex + endIndex) / 2);
      this.camera.position.set(center.x, center.y, cameraZ * middleIndex / 100);
      this.camera.updateMatrixWorld();
      minBBNDC.copy(boundingBox.min).project(this.camera);
      maxBBNDC.copy(boundingBox.max).project(this.camera);
      if ((Math.abs(minBBNDC.x) > 1) || (Math.abs(minBBNDC.y) > 1) || (Math.abs(maxBBNDC.x) > 1) || (Math.abs(maxBBNDC.y) > 1)) {
        startIndex = middleIndex + 1;
      }
      else {
        endIndex = middleIndex - 1;
        returnZ = cameraZ * middleIndex / 100;
      }
    }
    return returnZ;
  }

  public heightPOV(): void {
    const boundingBox = new THREE.Box3();
    boundingBox.setFromObject(this.scene);

    const center = boundingBox.getCenter(new THREE.Vector3());
    const size = boundingBox.getSize(new THREE.Vector3());

    // get the max side of the bounding box
    const maxDim = size.y;

    let radius = maxDim / 1.5;

    // Compute offset needed to move the camera back that much needed to center AABB (approx: better if from BB front face)
    const offset = radius / Math.tan(Math.PI / 180.0 * this.camera.fov * 0.5);
    let cameraZ = (offset + boundingBox.max.z - center.z) * .9;
    if (cameraZ < (size.z + center.z)) { cameraZ = size.z + center.z };

    this.camera.position.set(center.x, center.y, cameraZ);
    this.controls.target.x = center.x;
    this.controls.target.y = center.y;
    this.controls.target.z = center.z;
    this.controls.update();
  }

  public ResetPOV(scene: THREE.Scene, camera: THREE.PerspectiveCamera, controls?: ThreeOrbitControls, SceneSizeX?: number, SceneSizeY?: number, SceneSizeZ?: number): void {

    const boundingBox = new THREE.Box3();
    boundingBox.setFromObject(scene);

    const center = boundingBox.getCenter(new THREE.Vector3());
    const size = boundingBox.getSize(new THREE.Vector3());

    // get the max side of the bounding box
    const maxDim = (camera.aspect > (size.x / size.y) ? camera.aspect * size.y : size.x);

    let radius = maxDim / 4;

    // Compute offset needed to move the camera back that much needed to center AABB (approx: better if from BB front face)
    let offset = radius / Math.tan(Math.PI / 180.0 * camera.fov * 0.5);
    let cameraZ = (offset + boundingBox.max.z - center.z) * .9;
    if (cameraZ < (size.z + center.z)) { cameraZ = size.z + center.z };

    cameraZ = this.findBestCameraZ(center, camera, cameraZ, boundingBox);
    camera.position.set(center.x, center.y, cameraZ);

    this.controls.target.x = center.x;
    this.controls.target.y = center.y;
    this.controls.target.z = center.z;

    this.controls.update();
  }

  private createScene(scene: THREE.Scene, POG: ThreeDItemData, mySetting: PogSettings): any {   //  @Bala here using a thired party library so return type is any
    let SceneSize = new THREE.Vector3();
    this.createItems(POG, scene);
    this.createAnnotations(POG, scene);
    this.SetAnnotationMode(mySetting.isAnnotationView, scene);

    const sceneBox = new THREE.Box3().setFromObject(scene);

    SceneSize.x = Math.max(sceneBox.max.x, POG.Dimension.Width);
    SceneSize.y = Math.max(sceneBox.max.y, POG.Dimension.Height);
    SceneSize.z = Math.max(sceneBox.max.z, POG.Dimension.Depth);

    // lights
    let light;

    light = new THREE.DirectionalLight(0xaaaaaa);
    light.position.set(SceneSize.x / 2, SceneSize.y * 1.5, SceneSize.z * 2);
    scene.add(light);

    light = new THREE.DirectionalLight(0xffffff);
    light.position.set(SceneSize.x * 2, SceneSize.y * 1.5, SceneSize.z * 2);
    scene.add(light);

    light = new THREE.DirectionalLight(0xaaaaaa);
    light.position.set(-SceneSize.x, SceneSize.y * 1.5, SceneSize.z * 2);
    scene.add(light);

    light = new THREE.DirectionalLight(0x002288);
    light.position.set(-SceneSize.x, -SceneSize.y, -SceneSize.z);
    scene.add(light);

    light = new THREE.DirectionalLight(0x111111);
    light.position.set(sceneBox.min.x, SceneSize.y / 2, SceneSize.z * 20);
    scene.add(light);

    light = new THREE.DirectionalLight(0x666666);
    light.position.set(SceneSize.x / 2, SceneSize.y / 2, -SceneSize.z * 20);
    scene.add(light);

    light = new THREE.AmbientLight(0x555555);
    scene.add(light);

    return SceneSize;
  }

  private createScene2(scene: THREE.Scene, POG: ThreeDItemData, mySetting: PogSettings): void {
    this.createItems(POG, scene);
    this.createPOG(POG, scene);
  }

  public createItems(object: ThreeDItemData, parent: THREE.Object3D): void {
    if (object) {
      if ('Children' in object) {
        const array = object.Children;
        const length = array.length;
        for (let i = 0; i < length; i++) {
          const newObject = array[i];
          if (newObject.ObjectDerivedType == "ShoppingCart" || newObject.ObjectDerivedType == "Block") { continue; }
          const container = this.createItemContainer(newObject, object);

          parent.add(container);

          //TODO: @Bala need find another approach
          if (container.userData.Type == 'CoffinCase' || container.userData.Type == 'Basket') {
            this.createItems(newObject, container.children[0]);
          } else {
            this.createItems(newObject, container);
          }
        }
      }
    }
  }

  private createItemContainer(item: ObjectListItem, parent) {
    const container = new THREE.Object3D();
    const rendererName = item.ObjectDerivedType;
    if (rendererName) {
      this.threedPlanogramService.ThreeD(item, container, this.doDispose, this.create3DModel, rendererName);
    }
    container.position.x = item.Location.X;
    container.position.y = item.Location.Y;
    container.position.z = item.Location.Z;
    // Shelf slope is negative from clockwise rotation
    container.rotation.x = -Utils.degToRad(item.Rotation.X);
    container.rotation.y = Utils.degToRad(item.Rotation.Y);
    container.rotation.z = Utils.degToRad(item.Rotation.Z);
    if ('ChildOffset' in parent) {
      container.position.x += parent.ChildOffset.X;
      container.position.y += parent.ChildOffset.Y;
      container.position.z += parent.ChildOffset.Z;
    }

    container.name = item.$id;
    container.userData = { ToolTip: this.tooltipTemplate(item), Type: item.ObjectDerivedType };
    return container;
  }

  private createAnnotations(POG: ThreeDItemData, scene: THREE.Scene): void {
    const boxHelper = new THREE.BoxHelper(scene);
    const sceneBox = new THREE.Box3().setFromObject(boxHelper);
    POG.annotations.forEach((item) => {
      if (item.ObjectDerivedType.toLowerCase() == 'annotation' && (item.status != 'deleted')) {
        let rendererName = item.ObjectDerivedType;
        if (rendererName) {
          item.Attribute.location.locZ = sceneBox.max.z;
          item.Attribute.location.sceneWidth = sceneBox.max.x - sceneBox.min.x;
          this.threedPlanogramService.ThreeD(item, scene, this.doDispose, this.create3DModel, rendererName, POG);
        }
      }
    })
  }

  private SetAnnotationMode(annotationMode: number, scene: THREE.Scene): void {
    scene.traverse(function (child) {
      if (child.userData.hasOwnProperty("Annotation") == true) {
        child.visible = false;
        switch (annotationMode) {
          case 0:
            break;
          case 1:
            if (child.userData.Annotation == "image") { child.visible = true }
            if (child.userData.Annotation == "text") { child.visible = true }
            break;
          case 2:
            if (child.userData.Annotation == "text") { child.visible = true }
            break;
          case 3:
            if (child.userData.Annotation == "image") { child.visible = true }
            break;
        }
      }
    });
  }

  private setLabels(isOn: boolean, scene: THREE.Scene): void {
    scene.traverse((child) => {
      if (child.userData.hasOwnProperty("Label") == true) {
        child.visible = isOn || child.userData.labelAlways;
      }
    });
  }

  public createPOG(POG: ThreeDItemData, container: THREE.Scene): void {
    var rendererName = 'UprightDraw';
    if (rendererName) {
      this.threedPlanogramService.ThreeD(POG, container, null, null, rendererName);
    }
    rendererName = 'ModularFront';
    if (rendererName) {
      this.threedPlanogramService.ThreeD(POG, container, null, null, rendererName);
    }
    rendererName = "Section";
    if (rendererName) {
      this.threedPlanogramService.ThreeD(POG, container, null, null, rendererName);
    }
  }

  public create3DModel(pogObject: ThreeDItemData, container: THREE.Scene): boolean {

    if (pogObject.Fixture.ImageObject3D) {
      this.create3DFixture(pogObject);
      this.subscriptions.add(this.threedPlanogramService.get3DFixtureObjects(this.threedFixtureList).subscribe((result: IApiResponse<Pog3DObjects[]>) => {
        this.threedFixtureList = result.Data;
        let threeDFixtureObj = isArray.findWhere(this.threedFixtureList, { IdPogObject: pogObject.IDPOGObject });
        let index = isArray.findIndex(threeDFixtureObj.Image3DObjects, { IdClob: threeDFixtureObj.Selected3DObject.ID });
        if (index != -1) {
          let modelInfo = {
            Loader: "ThreeJS",
            Parameter1: threeDFixtureObj.Image3DObjects[index].Url,
            Parameter2: null
          };
          this.construct3DModel(modelInfo, container);
        }
      }));
    } else {
      return false;
    }

    return true;
  }

  private construct3DModel(modelInfo, container: THREE.Object3D): void {
    // This is designed to handle more than one 3D model fle format
    // The content of modelInfo.Loader will specify the loader to use
    // For now only the 'ThreeJS' ObjectLoder is supported
    switch (modelInfo.Loader) {
      case 'ThreeJS':
        {
          const onProgress = (xhr) => {
            if (xhr.target.status == 404) {
            }
            else if (xhr.lengthComputable) {
            }
          };

          const onError = (xhr) => {
          };

          var loader = new THREE.ObjectLoader();
          loader.load(modelInfo.Parameter1, (object) => {
            if (container.children.length > 0) {
              // If we made a placeh holder it should be the first and only chils of the container
              var placeHolder = container.children[0];
              container.remove(placeHolder);
              this.doDispose(placeHolder);
            }
            container.add(object);
          }, onProgress, onError);
        }
        break;
    }
  }

  public createFixture(shelfObject, container) {        // TODO: @Bala this method is never called.
    const used3DModel = this.create3DModel(shelfObject, container);
    if (used3DModel) return null;

    let width;
    let height;
    let depth;

    if (shelfObject.ObjectType != AppConstantSpace.FIXTUREOBJ) {
      return;
    }

    width = shelfObject.Dimension.Width;
    height = shelfObject.Dimension.Height;
    depth = shelfObject.Dimension.Depth;

    let geometry = new THREE.BoxGeometry(width, height, depth);
    let material = new THREE.MeshPhongMaterial({ color: 0xff0000, wireframe: true });
    let cube = new THREE.Mesh(geometry, material);

    cube.position.x = width / 2;
    cube.position.y = height / 2;
    cube.position.z = depth / 2;

    container.add(cube);

    return cube;
  }

  public doDispose = (obj) => {
    if (obj !== null) {
      while (obj.children.length) {
        let ch = obj.children[0];
        obj.remove(obj.children[0]);
        this.doDispose(ch);
        ch = undefined;
      }
      if (obj.geometry) {
        obj.geometry.dispose();
        obj.geometry = undefined;
      }
      if (obj.material) {
        if (obj.material.materials) {
          while (obj.material.materials.length) {
            var mat = obj.material.materials.pop();
            mat.dispose();
            mat = undefined;
          }
        }
        if (obj.material.dispose) {
          obj.material.dispose();
        }
        obj.material = undefined;
      }
      if (obj.texture) {
        obj.texture.dispose();
        obj.texture = undefined;
      }
      if (obj.dispose) {
        obj.dispose();
      }
    }
    obj = undefined;
  }

  private DumpScene(scene): void {            // TODO: @Bala this method is not used
    let output = scene.toJSON();
    output = JSON.stringify(output, null, '\t');
    output = output.replace(/[\n\t]+([\d\.e\-\[\]]+)/g, '$1');
  }

  public getAllFixtures(object: ThreeDItemData) {
    let fixtureArray = [];
    let eachRecursive = (object) => {
      if (object.hasOwnProperty('Children')) {
        isArray.forEach(object.Children, (child, key) => {
          if (child.ObjectDerivedType == AppConstantSpace.STANDARDSHELFOBJ || child.ObjectDerivedType == AppConstantSpace.PEGBOARDOBJ || child.ObjectDerivedType == AppConstantSpace.SLOTWALLOBJ || child.ObjectDerivedType == AppConstantSpace.CROSSBAROBJ) {
            fixtureArray.push(child);
          }
          eachRecursive(child);
        }, object);
      }
    };
    eachRecursive(object);
    return fixtureArray;
  }

  private prepare3DFixtureList(fixtureList): void {       // TODO: @Bala need to define the type
    this.threedFixtureList = [];

    isArray.forEach(fixtureList, function (value, key) {
      this.threedFixtureList.push({ IdPogObject: value.IDPOGObject, IdFixtureType: value.Fixture.IDFixtureType, Height: value.Fixture.Height, Width: value.Fixture.Width, Depth: value.Fixture.Depth, Image3DObjects: [], Selected3DObject: {} });
    });
  }

  private create3DFixture(pogObject: ThreeDItemData): void {
    let fixtureList = this.getAllFixtures(this.dataSource);

    if (isArray.isEmpty(this.threedFixtureList)) {
      this.prepare3DFixtureList(fixtureList);
    }

  }

  // This is a proxy function to create 3D model names for fixture
  // In the final implementation this should get the 3D model file name from an attribute in the fixture object (like images in products)
  // This method needs to return an Object with three attribute:
  //    Loader:        A designator for the type od model file to use. For now only 'ThreeJS' is supported
  //    Parameter1:    The first parameter to the loader Load() function. This is normally the location of the model file
  //    Parameter2:    The second parameter to the loader Load() function. On many loaders this is the location of a second model file (the MTL file in the case of the OBJ loader)

  private get3DModelInfo(pogObject: ThreeDItemData) {     // TODO: @Bala this method is never called
    let returnValue = null;
    const modelDirectory = '/3D models/';

    switch (pogObject.ObjectDerivedType) {
      case AppConstantSpace.STANDARDSHELFOBJ:
        returnValue = {
          Loader: 'ThreeJS',
          Parameter1: modelDirectory + pogObject.ObjectDerivedType + '_' + pogObject.Dimension.Width + '_' + pogObject.Dimension.Depth + '.json',
          Parameter2: null
        };
        break;
      case AppConstantSpace.CROSSBAROBJ:
      case AppConstantSpace.SLOTWALLOBJ:
      case AppConstantSpace.PEGBOARDOBJ:
        returnValue = {
          Loader: 'ThreeJS',
          Parameter1: modelDirectory + pogObject.ObjectDerivedType + '_' + pogObject.Dimension.Width + '_' + pogObject.Dimension.Height + '.json',
          Parameter2: null
        };
        break;
      case AppConstantSpace.BASKETOBJ:
      case AppConstantSpace.COFFINCASEOBJ:
        returnValue = {

          Loader: 'ThreeJS',
          Parameter1: modelDirectory + pogObject.ObjectDerivedType + '_' + pogObject.Dimension.Width + '_' + pogObject.Dimension.Height + '_' + pogObject.Dimension.Depth + '.json',
          Parameter2: null
        };
        break;
      case AppConstantSpace.BLOCK_FIXTURE:
        returnValue = {
          Loader: 'ThreeJS',
          Parameter1: modelDirectory + pogObject.ObjectDerivedType + '_' + pogObject.Dimension.Width + '_' + pogObject.Dimension.Height + '_' + pogObject.Dimension.Depth + '.json',
          Parameter2: null
        };
        break;
      case AppConstantSpace.FIXTUREOBJ:
        returnValue = {
          Loader: 'ThreeJS',
          Parameter1: modelDirectory + pogObject.ObjectDerivedType + '_' + pogObject.Dimension.Width + '_' + pogObject.Dimension.Height + '_' + pogObject.Dimension.Depth + '.json',
          Parameter2: null
        };
        break;
    }
    // This block of code is just to only use Model Names that exist for testing
    // In real life the whole function would only return files that exist.
    var fileList = [
      // uncomment out these two lines to work with test data
      'StandardShelf_30.5_22.5',
      'StandardShelf_30.5_27.5',
      'StandardShelf_48_24',
      'StandardShelf_48_19',
      'StandardShelf_48_16'
    ];
    var nameOK = false;
    for (var i = 0; i < fileList.length; i++) {
      if (returnValue.Parameter1.toLowerCase().indexOf(fileList[i].toLowerCase()) > -1) {
        nameOK = true;
        break;
      }
    }
    if (!nameOK) return null;

    return returnValue;
  }

  ngOnDestroy() {

    const cleanMaterial = material => {
      material.dispose()

      // dispose textures
      for (const key of Object.keys(material)) {
        const value = material[key]
        if (value && typeof value === 'object' && 'minFilter' in value) {
          value.dispose()
        }
      }
    }

    this.scene.traverse((object:any) => {
      if (!object.isMesh) return

      object.geometry.dispose()

      if (object.material.isMaterial) {
        cleanMaterial(object.material)
      } else {
        // an array of materials
        for (const material of object.material) cleanMaterial(material)
      }
    })

    cancelAnimationFrame(0);
    this.scene = null
    //this.camera = null
    this.renderer && this.renderer.renderLists.dispose()
    this.renderer.dispose()
    this.renderer = null;
    this.subscriptions.unsubscribe();
  }
}

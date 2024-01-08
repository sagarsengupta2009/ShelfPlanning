import { Injectable } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { OnReady, ConsoleLogService } from 'src/app/framework.module';
import { ParentAppType, AssortMode, AllocateMode, AllocateProjectType } from 'src/app/shared/models';

declare const window: any;

interface AllocateAzureKeys {
  url: string;
  code: string;
}

@Injectable({
  providedIn: 'root',
})
export class ParentApplicationService extends OnReady {

  private parentApp: ParentAppType = ParentAppType.Shelf

  // Assort specific states
  private assortMode: AssortMode = null;

  // Allocate specific states
  private allocateMode: AllocateMode = null;
  private allocateProjectType: AllocateProjectType = null;
  private allocateAzureKeys: AllocateAzureKeys = null;

  // These 2 can be passed from any of the apps
  public idStore: number = null;
  public pogId: number = null;

  private shelfAutoDownloadMode: boolean = false;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly log: ConsoleLogService,
  ) {
    super();
    this.init();
  }

  //#region  public getters

  // Parent Apps
  public get isShelfApp(): boolean {
    return this.isParent(ParentAppType.Shelf);
  }
  public get isAssortApp(): boolean {
    return this.isParent(ParentAppType.Assort);
  }
  public get isAllocateApp(): boolean {
    return this.isParent(ParentAppType.Allocate);
  }
  public get isWebViewApp(): boolean {
    return this.isParent(ParentAppType.WebView);
  }

  //Shelf App - Modes
  public get isShelfInAutoMode(): boolean {
    return this.shelfAutoDownloadMode;
  }

  // Assort App - Modes
  public get isAssortAppInIAssortNiciMode(): boolean {
    return this.isAssortApp && this.isAssortMode(AssortMode.iAssortNICI);
  }
  public get isAssortAppInAutoMode(): boolean {
    return this.isAssortApp && this.isAssortMode(AssortMode.Auto);
  }

  // Allocate App - modes
  public get isAllocateAppInReviewMode(): boolean {
    return this.isAllocateApp && this.isAllocateMode(AllocateMode.Review);
  }
  public get isAllocateAppInManualMode(): boolean {
    return this.isAllocateApp && this.isAllocateMode(AllocateMode.Manual);
  }

  // Allocate App - ProjectTypes
  public get isAllocateAppInNiciProjectType(): boolean {
    return this.isAllocateApp && this.isAllocateProjectType(AllocateProjectType.NICI);
  }
  public get isAllocateAppInResetProjectType(): boolean {
    return this.isAllocateApp && this.isAllocateProjectType(AllocateProjectType.Reset);
  }

  // Allocate App - AzureKeys
  public get allocateAzure(): AllocateAzureKeys {
    if (this.allocateAzureKeys) {
      return this.allocateAzureKeys;
    }
    this.log.warning(`PareneApplication info 'allocateAzureKeys' not resolved`);
  }

  // Combination getter/s
  /** Is Allocate App in Manual mode with NICI project
   *  OR AssortApp in iAssortNICI mode
   */
  public get isNiciMode(): boolean {

    if (this.isAllocateAppInManualMode
      && this.isAllocateProjectType(AllocateProjectType.NICI)) {
      return true;
    }

    if (this.isParent(ParentAppType.Assort)
      && this.isAssortMode(AssortMode.iAssortNICI)) {
      return true;
    }

    return false;
  }

  //#endregion  public getters

  //#region  public methods

  public setPogId(pogId: number): void {
    this.pogId = pogId;
  }
  public setIdStore(IdStore: number): void {
    this.idStore = IdStore;
  }

  public getCurrentParentApp(): ParentAppType {
    return this.parentApp;
  }

  /**
   * This needs to be called only from allocate-service.
   */
  public updateParentInfo(): void {
    // TODO: @malu params and update logic
    this.notifySubscribers();
  }

  //#endregion  public methods

  //#region  private methods

  private isParent(app: ParentAppType): boolean {
    return this.parentApp === app;
  }
  private isAssortMode(mode: AssortMode): boolean {
    return this.assortMode === mode;
  }
  private isAllocateMode(mode: AllocateMode): boolean {
    return this.allocateMode == mode;
  }
  private isAllocateProjectType(projectType: AllocateProjectType): boolean {
    return this.allocateProjectType === projectType;
  }

  private init() {
    this.route.queryParams.subscribe((params) => {
      this.updateParentAppInfo(params.link, params.mode, params.vmode, params.IDStore, params.loadpogID);
      this.notifySubscribers();
    });
  }

  public updateParentAppInfo(link: string, mode: string, vmode: string, idStore: string, pogId: string): void {

    // need to update window since the services are not available in the common svg classes
    this.parentApp = window.application = this.identifyParentApp(link, vmode);

    this.setupIdStoreAndPogId(idStore, pogId);

    switch (this.parentApp) {
      case ParentAppType.Allocate:
        this.setupAllocateInfo(mode);
        break;
      case ParentAppType.Assort:
        this.setupAssortInfo(mode);
        break;
      case ParentAppType.Shelf:
        this.setupShelfInfo(pogId);
        break;
      default: // ParentAppType.WebView
        break;
    }
  }

  private identifyParentApp(linkParam: string, vmode: string): ParentAppType {
    if (vmode) {
      return ParentAppType.WebView;
    }
    switch (linkParam) {
      case 'allocate': return ParentAppType.Allocate;
      case 'iAssort': return ParentAppType.Assort;
      default: return ParentAppType.Shelf;
    }
  }

  private setupAllocateInfo(modePram: string) {

    this.allocateMode = modePram == 'manual'
      ? AllocateMode.Manual
      : AllocateMode.Review;

    // projectType can be, 'RESET' or 'NICI'
    const projectType = window.parent.currentProjectType;
    this.allocateProjectType = projectType == 'RESET'
      ? AllocateProjectType.Reset
      : AllocateProjectType.NICI;

    var azureKeys = window.parent.getAllocateAzureKeys();
    this.allocateAzureKeys = {
      url: azureKeys.URL,
      code: azureKeys.code,
    };
  }

  private setupAssortInfo(modeParam: string) {
    this.assortMode = modeParam == 'iAssortNICI'
      ? AssortMode.iAssortNICI
      : AssortMode.Auto;
  }

  private setupShelfInfo(pogId: string) {
    this.shelfAutoDownloadMode = pogId ? true : false;
  }

  private setupIdStoreAndPogId(idStore: string, pogId: string) {
    this.idStore = idStore ? +idStore : null;
    this.pogId = pogId ? +pogId : null;
  }

  //#endregion  private methods
}

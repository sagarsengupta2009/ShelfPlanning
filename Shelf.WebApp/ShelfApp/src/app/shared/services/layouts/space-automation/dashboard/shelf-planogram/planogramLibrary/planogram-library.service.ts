import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { TranslateService } from '@ngx-translate/core';
import { CompositeFilterDescriptor, FilterDescriptor, GroupDescriptor, SortDescriptor } from '@progress/kendo-data-query';

import { UserPermissionsService, PlanogramStoreService, SharedService, UserService, ParentApplicationService } from 'src/app/shared/services';
import {
  IApiResponse, PogPinningUnpinningResult, AllSettings, Planograms,
  POGLibraryListItem, PogLoadCounts, Planogram
} from 'src/app/shared/models';
import { AppConstantSpace, Utils } from 'src/app/shared/constants';
import { PlanogramLibraryApiService } from './planogram-library-api.service';
import { Section } from 'src/app/shared/classes';
import { WorkspaceInfo } from 'src/app/shared/models/enums';

declare const window: any;


@Injectable({
  providedIn: 'root'
})
export class PlanogramLibraryService {

  public planogramLibGridState: { filter: CompositeFilterDescriptor, sort: SortDescriptor[], group: GroupDescriptor[] }
    = { filter: { logic: 'and', filters: [] }, sort: [], group: [] };
  public mapper: POGLibraryListItem[];
  public mapperForVmode: POGLibraryListItem[] = [];
  public activePanelID: string = '';
  public pogChangesInworkspace: BehaviorSubject<WorkspaceInfo> = new BehaviorSubject(null);
  public FixtureGallery = new Subject<any>();
  public PogSettingsHandler = new Subject<any>();
  public isClearFilter = new Subject<boolean>();
  public updatePlanogramList = new BehaviorSubject(null);
  public gridFilter: CompositeFilterDescriptor;
  public savedSelection: number[] = [];
  public selectedGridIndex: number = 0;
  public tempMultipleSections: Section[] = [];


  constructor(
    private readonly planogramStore: PlanogramStoreService,
    private readonly user: UserService,
    private readonly translate: TranslateService,
    private readonly sharedService: SharedService,
    private readonly planogramLibApiService: PlanogramLibraryApiService,
    private readonly userPermissions: UserPermissionsService,
    private readonly parentApp:ParentApplicationService
  ) { }

  // calculation no of loaded planograms from mapper array
  public getLoadCount(): PogLoadCounts {
    const maxPogCount = this.planogramStore.appSettings.maxPogCount;
    const loadedCount = this.mapper.filter(it => it.isLoaded).length;
    const canDownload = loadedCount < maxPogCount || maxPogCount == -1;
    const count: PogLoadCounts = { maxPogCount, loadedCount, canDownload };
    return count;
  }

  public updateStorelength(obj: { IDPOG: number; StoreData: any[] }): void {
    for (let d of this.mapper) {
      if (d.IDPOG == obj.IDPOG) {
        d.NoOfStores = obj.StoreData.length;
      }
    }
    this.planogramStore.mappers = this.mapper;
  }

  public markRequestToPin(requestCollection: Planograms[], ajaxCall: boolean, data?: PogPinningUnpinningResult[]): void {

    if (ajaxCall) {
      for (let i = 0; i < data.length; i++) {
        if (data[i].Result) {
          // Log.info('SUCCESS ADDED OF POGID', d.Data[i].IDPOG);
          const obj = requestCollection.find(it => it.IDPOG == data[i].IDPOG);
          obj.IsReadOnly = data[i].IsReadOnly;
          obj.POGType = requestCollection[i].POGType;
          obj.POGTypeSymbol = requestCollection[i].POGTypeSymbol;
          obj.POGTypeValue = requestCollection[i].POGTypeValue;
          obj.IsMarkedAsDelete = data[i].IsMarkedAsDelete;
          let pinnedObject = { ...obj, isPinned: true };
          this.makeClientSidePin(pinnedObject);
        }
      }
    } else {
      for (let i = 0; i < requestCollection.length; i++) {
        this.makeClientSidePin(requestCollection[i]);
      }

      // assort specific code
      if (this.sharedService.link === 'iAssort') {
        window.parent.postMessage('invokePaceFunc:shelfLoaded', '*');
      }
    }

    this.planogramStore.mappers = this.mapper;
  }



  public markRequestToFavUnfav(data: Planograms[], pin: boolean): void {
    for (let d of data) {
      let pog = this.mapper.find(item => item.IDPOG == d.IDPOG)
      if (pog) {
        pog.IsFavorite = pin;
        pog.isPinned = this.translate.instant(pin ? 'PINNED' : 'UNPINNED');
      }
    }
    this.planogramStore.mappers = this.mapper;
  }

  private updateVersion(status: number): number {
    let lookUpHolderData = this.planogramStore.lookUpHolder;
    let planogramVersion = 'PlanogramVersion';
    const versionList = lookUpHolderData[planogramVersion].options;
    const version = versionList.find(it => it.value == status);
    return version ? Number(version.text) : Number(status);
  }

  private makeClientSidePin(sendObj: Planograms): void {
    const clonePermission = this.userPermissions.getPermissions('POGCLONE');
    let currentUser = this.user.emailId;
    let temp = 0;
    let obj: POGLibraryListItem = {
      ...sendObj,
      sectionID: '',
      version: this.updateVersion(sendObj.POGStatus),
      editable: (temp % 2 === 0),
      globalUniqueID: Utils.generateGUID(),
      isLoaded: false,
      IsLoaded: this.translate.instant('UNLOADED'),
      isPinned: this.translate.instant('UNPINNED'),

      isCheckedOut: (sendObj.CheckoutOwner != null),
      isCheckInOutEnable: (sendObj.CheckoutOwner == null) || (sendObj.CheckoutOwner === currentUser),
      isSelected: false,
      PermissionRead: clonePermission?.Read,
      PermissionCreate: clonePermission?.Create,
    };

    if (obj.isnew) {
      obj.isLoaded = true;
      obj.IsLoaded = this.translate.instant('LOADED');
      obj.isnew = this.translate.instant('PLANOGRAM_LIBRARY_NEW');
    }
    if (obj.IsFavorite) {
      obj.isPinned = this.translate.instant('PINNED');
    }

    obj.POGType = sendObj.POGType;
    obj.POGTypeSymbol = sendObj.POGTypeSymbol;
    obj.POGTypeValue = sendObj.POGTypeValue;
    obj.IDPogStatus = obj.IDPogStatus ? obj.IDPogStatus : obj.POGStatus;
    obj.IsReadOnly = (sendObj.IsReadOnly == undefined && sendObj.IsReadOnly == null) ? false : sendObj.IsReadOnly;
    obj.IsReadOnly = (sendObj.CheckoutOwner === undefined || sendObj.CheckoutOwner == null || sendObj.CheckoutOwner == 'null' || typeof sendObj.CheckoutOwner == "undefined" || sendObj.CheckoutOwner === "") ?
      obj.IsReadOnly
      : (sendObj.CheckoutOwner.toLowerCase() === this.sharedService.SYSTEM) ? true : obj.IsReadOnly;

    if(this.parentApp.isAllocateApp && window.parent.savedPOG.includes(obj.IDPOG.toString())){
      obj.isLoaded = true;
    }
    
    this.mapper.push(obj);
  }

  public getObjectFromIDPOG(IDPOG: number): POGLibraryListItem | undefined {
    return this.mapper.find(it => it.IDPOG == IDPOG);
  }

  public getCurrentObject(guid: string): POGLibraryListItem | undefined {
    return this.mapper.find(it => it.globalUniqueID == guid);
  }

  public removePlanogramVm(sectionID: string): void {
    delete this.sharedService.planogramVMs[sectionID];
    this.sharedService.cleanBySectionId(sectionID);
    this.sharedService.setActiveSectionId("");
    this.removeAllObselete();
    this.pogChangesInworkspace.next(WorkspaceInfo.LOADUNLOAD);
  }

  public removeAllObselete(): void {
    this.mapper = this.mapper.filter(it => !it.isObsolete || it.isLoaded);
  }

  public markAlreadyLoaded(sendObj: { IDPOG: number; isLoaded: boolean; sectionID: string; }): void {
    for (let d of this.mapper) {
      if (d.IDPOG == sendObj.IDPOG) {
        if (sendObj.isLoaded) {
          d.sectionID = sendObj.sectionID
          d.isLoaded = true;
          d.IsLoaded = this.translate.instant('LOADED');
        } else {
          d.sectionID = '';
          d.isLoaded = false;
          d.IsLoaded = this.translate.instant('UNLOADED');
        }
      }
    }
    this.planogramStore.mappers = this.mapper;
    this.pogChangesInworkspace.next(WorkspaceInfo.LOADUNLOAD);
  }

  public markRequestToUnpin(items: { IDPOG: number }[]): void {
    const idsToRemove = items.map(it => it.IDPOG);
    this.mapper = this.mapper.filter(it => !idsToRemove.includes(it.IDPOG))
    this.planogramStore.mappers = this.mapper;
  }

  // private // changed to observable
  public updateMapperObject(guidList: POGLibraryListItem[], undoRedo?: boolean, hideLoader?: boolean): Observable<IApiResponse<Planograms[]>> {
    const ids = guidList.map(it => it.IDPOG);

    return this.planogramLibApiService.getPOGInfo(ids, hideLoader).pipe(tap((response) => {
      const sectionID = this.sharedService.getActiveSectionId();
      if (sectionID) {
        var currObj = this.sharedService.getObject(sectionID, sectionID) as Section;
        var activeIDPOG = currObj.IDPOG;
      }
      let oldMapperObj: POGLibraryListItem;
      for (const pog of response.Data) {
        if (sectionID) {
          if (pog.IDPOG === activeIDPOG) {
            // We are not sure why it was written here to update the version of pog.
            // Actually we shouldn't update the latest pog version for downloaded pog
            // ObjectProvider.setObjectField(sectionID, 'Version', response.Data[i].POGVersion, sectionID);
            this.sharedService.setObjectField(sectionID, 'IDPOGStatus', pog.POGStatus, sectionID, null);
          }
        }
        oldMapperObj = guidList.find(it => it.IDPOG == pog.IDPOG);

        // check reload is required or not
        // if required unload and load the planogram
        // modifying name form property grid
        oldMapperObj.Name = undoRedo ? currObj.Name : pog.Name;

        oldMapperObj.IsStatusLock = pog.IsStatusLock;
        oldMapperObj.POGLastModifiedDate = pog.POGLastModifiedDate;
        oldMapperObj.POGStatus = pog.POGStatus;
        oldMapperObj.Version = pog.Version;
        oldMapperObj.Dimension = pog.Dimension;
        oldMapperObj.PogStatusSymbol = pog.PogStatusSymbol;
        oldMapperObj.POGType = pog.POGType;
        oldMapperObj.POGTypeSymbol = pog.POGTypeSymbol;
        oldMapperObj.POGTypeValue = pog.POGTypeValue;
        oldMapperObj.IDPogStatus = pog.IDPogStatus ? pog.IDPogStatus : pog.POGStatus;
        oldMapperObj.POGLastModifiedBy = pog.POGLastModifiedBy;
        oldMapperObj.CheckoutOwner = pog.CheckoutOwner;

        oldMapperObj.L3 = pog.L3;
        oldMapperObj.L4 = pog.L4;
        oldMapperObj.L5 = pog.L5;
        oldMapperObj.L6 = pog.L6;

        oldMapperObj.IsMerchandized = pog.IsMerchandized;
        oldMapperObj.PogDepth = pog.PogDepth;
        oldMapperObj.PogHeight = pog.PogHeight;
        oldMapperObj.PogWidth = pog.PogWidth;


        oldMapperObj.IsReadOnly = (pog.CheckoutOwner?.toLowerCase() === AppConstantSpace.SYSTEM) || pog.IsReadOnly;

        if (this.sharedService.isLivePogEditable) {
          oldMapperObj.IsReadOnly = false;
        }
        oldMapperObj.Image = pog.Image;
        oldMapperObj.EffectiveFrom = pog.EffectiveFrom;
        oldMapperObj.EffectiveTo = pog.EffectiveTo;
        oldMapperObj.NoOfProducts = pog.NoOfProducts;
        oldMapperObj.NoOfStores = pog.NoOfStores;
      }
      this.updateSavePlanogram(oldMapperObj);
    }));
  }

  private updateSavePlanogram(pogObj: POGLibraryListItem): void {
    const index = this.mapper.findIndex(item => item.IDPOG == pogObj.IDPOG);
    if (index > -1) {
      this.mapper[index] = pogObj;
      this.planogramStore.mappers = this.mapper;
      this.pogChangesInworkspace.next(WorkspaceInfo.SAVEINWORKSPACE);
    }
  }


  public prepareGridStatus(): void {
    const cleanTemplate = (items: { field: string }[]) => items?.length ??
      items
        ?.filter(it => it.field.includes('_template'))
        .forEach(it => it.field = it.field.split('_')[0]);

    this.planogramLibGridState?.sort ?? cleanTemplate(this.planogramLibGridState.sort);
    this.planogramLibGridState?.group ?? cleanTemplate(this.planogramLibGridState.group);

    if (this.planogramLibGridState.filter) {
      for (let obj of this.planogramLibGridState.filter.filters) {
        const item = obj as CompositeFilterDescriptor;
        for (let it of item.filters) {
          const value = it as FilterDescriptor;
          const field = value.field as string;
          if (field.includes('_template')) {
            value.field = field.split('_')[0];
            const returnValue: string = value.value.substring(value.value.indexOf('data-text'));
            value.value = returnValue.substring(returnValue.indexOf('>') + 1, returnValue.indexOf('</')).trim();
            if (value.field == 'isPinned') {
              if (returnValue.includes('unFavorite')) {
                value.value = this.translate.instant('UNPINNED');
              } else if (returnValue.includes('Favorite')) {
                value.value = this.translate.instant('PINNED');
              }
            } else if (value.field == 'IsLoaded') {
              if (returnValue.includes('unload')) {
                value.value = this.translate.instant('LOADED');
              } else if (returnValue.includes('load')) {
                value.value = this.translate.instant('UNLOADED');
              }
            }
          }
        }
      }
    }
  }

  public updateName(IDPOG: number, Name: string): void {
    const item = this.mapper.find(item => item.IDPOG == IDPOG);
    if (item) {
      item.Name = Name;
    }
    this.planogramStore.mappers = this.mapper;
    this.pogChangesInworkspace.next(WorkspaceInfo.NAMECHANGES);
  }

  public checkIfFlag(checkObj: POGLibraryListItem, flagType: string): boolean {
    return this.mapper.filter(it => it.IDPOG == checkObj.IDPOG).map(it => it[flagType])[0] || false;
  }

  public promotedemoteUpdate(res: { Data: { idPog: number }[]; }): void {
    res.Data.map(it => this.mapper.find(item => item.IDPOG == it.idPog))
      .filter(it => it)
      .forEach(it => it.IsLocked = true);
    this.planogramStore.mappers = this.mapper;
  }

  public openFixtureGalleryDialog(): void {
    this.FixtureGallery.next(true);
  }

  public PlanogramSettings(): void {
    this.PogSettingsHandler.next(true);
  }

}

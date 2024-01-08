import { Injectable } from '@angular/core';
import { HttpHeaders, HttpClient, HttpParams } from '@angular/common/http';
import * as _ from 'lodash';
import { Observable, Subject } from 'rxjs';
import { apiEndPoints } from '../../../../../../../models/apiEndPoints';
import { PanelIds } from 'src/app/shared/models/planogram-enums';
import { ConsoleLogService } from 'src/app/framework.module';
import { PaBroadcasterService, ParentApplicationService, PlanogramService, SharedService } from 'src/app/shared/services';
import {
  IApiResponse, IPanelInfo, IPanelPointers,
  SectionResponse, SvgTooltip
} from 'src/app/shared/models';
import { ProductAuth } from 'src/app/shared/models/panel/panel-containt/product-auth-data';
import { ProductPackageType } from 'src/app/shared/models/planogram/product-package-type';
import { UpdatePOGInfo } from 'src/app/shared/models/config/application-resources';
import { ConfigService } from 'src/app/shared/services/common/configuration/config.service';
import { TranslateService } from '@ngx-translate/core';
import { AppConstantSpace } from 'src/app/shared/constants';
@Injectable({
  providedIn: 'root'
})
export class PanelService {
  public view: string = 'svg';
  public updateSidePanelfordelete = new Subject<object[]>();
  public panelSyncEventInvoked = new Subject<boolean>();
  public selectedPogs: number[] = [];
  public activePanelID: string = 'panelOne';  //default panalOne
  private _invokedIdpogApiForPanelID: number;
  public skipApiCallForPanel: { panelID: string, flag: boolean, IDPOG?: number } = { panelID: '', flag: false, IDPOG: null };

  private panelOne: IPanelInfo = {
    sectionID: '',
    IDPOG: null,
    view: '',
    componentID: undefined,
    globalUniqueID: '',
    scope: '',
    flag: true,
    isLoaded: false,
    index: -1,
    selectedViewKey: '',
    previousView: undefined
  };
  private panelTwo: IPanelInfo = {
    sectionID: '',
    IDPOG: null,
    view: '',
    componentID: undefined,
    globalUniqueID: '',
    scope: '',
    flag: false,
    isLoaded: false,
    index: -1,
    selectedViewKey: '',
    previousView: undefined
  };
  
  public panelPointer: IPanelPointers = { panelOne: this.panelOne, panelTwo: this.panelTwo };
  public donwloadPogData: string = '';
  public updateHeaderIcons = new Subject<boolean>();
  public loadWorkSheet = new Subject<Object>();
  public updateView = new Subject<{componentId: number, selectedKey: string}>();
  constructor(
    private readonly http: HttpClient,
    private readonly log: ConsoleLogService,
    private readonly envConfig: ConfigService,
    private readonly planogramService: PlanogramService,
    private readonly sharedService: SharedService,
    private readonly parentApp: ParentApplicationService,
    private readonly paBroadcaster: PaBroadcasterService,
    private readonly translate: TranslateService
  ) { }

  public set invokedIdpogApiForPanelID(value: number) {
    this._invokedIdpogApiForPanelID = value;
  }

  public get invokedIdpogApiForPanelID(): number {
    return this._invokedIdpogApiForPanelID;
  }

  public getPOGThumbnailAzureSVG(imageURL: string): Observable<string> {
    const headers = new HttpHeaders();
    headers.set('Accept', 'image/svg+xml');
    return this.http.get(imageURL, { headers, responseType: 'text' });
  }

  private getPanelOneInfo(): IPanelInfo { return this.panelPointer[PanelIds.One] };
  private getPanelTwoInfo(): IPanelInfo { return this.panelPointer[PanelIds.Two] };

  public getActivePanelId(activeSectionId: string, closestPanelId: string): PanelIds {
    if (!activeSectionId || !closestPanelId) { // validation
      this.log.warning(`getActivePanelId() invalid params detected! `
        + `activeSectionId: '${activeSectionId}', closestPanelId: '${closestPanelId}', `
        + ` return defaults to: '${PanelIds.One}'`);
      return PanelIds.One;
    }

    const panelOne = this.getPanelOneInfo();
    const panelTwo = this.getPanelTwoInfo();

    if (panelOne.sectionID == panelTwo.sectionID) {
      return closestPanelId as PanelIds;
    } // else
    switch (activeSectionId) {
      case panelOne.sectionID: return PanelIds.One;
      case panelTwo.sectionID: return PanelIds.Two;
      default: return PanelIds.One; // This is added for fail safe.
    }
  }
  public get ActivePanelInfo(): IPanelInfo {
    return this.panelPointer[this.activePanelID];
  }
  public getInactiveSectionId(activePanelId: PanelIds): string {
    switch (activePanelId) {
      case PanelIds.One: return this.getPanelTwoInfo().sectionID;
      case PanelIds.Two: return this.getPanelOneInfo().sectionID;
      default: return this.getPanelTwoInfo().sectionID;  // This is added for fail safe.
    }
  }
  public getActiveSectionId(activePanelId: PanelIds): string {
    switch (activePanelId) {
      case PanelIds.One: return this.getPanelOneInfo().sectionID;
      case PanelIds.Two: return this.getPanelTwoInfo().sectionID;
      default: return this.getPanelOneInfo().sectionID;  // This is added for fail safe.
    }
  }


  public getPlanogramData(IDPOG: number): Observable<IApiResponse<SectionResponse>> {
    const headers = new HttpParams().
      set('ids', IDPOG).
      set('idScenario', '-1');
    return this.http.get<IApiResponse<SectionResponse>>(`${this.envConfig.shelfapi}${apiEndPoints.apiTogetPlanogramData}`, { params: headers });
  }


  public getProductAuthForPOG(pogId: number): Observable<IApiResponse<ProductAuth>> {
    const url = `${this.envConfig.shelfapi}${apiEndPoints.getProductAuthForPOG}`;
    const options = { IDPOG: pogId, IDPackages: [] };
    // Added 'skipSuccessMsg' as a header option to skip success message (toaster)
    let headers = new HttpHeaders();
    headers = headers.append('skipSuccessMsg', 'true');
    return this.http.post<IApiResponse<ProductAuth>>(url, options, { headers });
  }

  public getProductAvailablePackageType(idProducts: number[]): Observable<IApiResponse<ProductPackageType[]>> {
    let url = `${this.envConfig.shelfapi}${apiEndPoints.getProductAvailablePackageType}`;
    // Added 'skipSuccessMsg' as a header option to skip success message (toaster)
    let headers = new HttpHeaders();
    headers = headers.append('skipSuccessMsg', 'true');
    return this.http.post<IApiResponse<ProductPackageType[]>>(url, idProducts,{headers});
  }

  public updatePanel(currentPanelID: string, sectionId: string): void {
    let previousPanelId: string = this.activePanelID;
    this.sharedService.setActiveSectionId(sectionId);
    this.activePanelID = currentPanelID;

    if (currentPanelID != previousPanelId) {
      const obj: UpdatePOGInfo = {
        isPogDownloaded: this.panelPointer[currentPanelID].isLoaded,
        pogInfo: this.planogramService.getCurrentObject(this.panelPointer[currentPanelID].globalUniqueID),
        displayView: this.panelPointer[currentPanelID].view,
      };
      this.planogramService.updatePOGInfo.next(obj);
    }

    this.sharedService.propertyGridUpdateData.next(true);
    //Todo: @Priyanka @Avadh Revisit whether this emit for shopping cart is necessary
    //this.sharedService.changeInCartItems.next(true);
    this.sharedService.updateHighlight.next(true);
    this.sharedService.updateCharts.next(true);
    if (this.parentApp.isAllocateApp) {
      this.paBroadcaster.setCurrentActivePanel();
    }
  }

  public sortChildrens(data: SectionResponse): SectionResponse {
    const shpCart = [];
    if (data) {
        for (const [i, d] of data.Children.entries()) {
            if (d.Fixture['FixtureType'] === AppConstantSpace.SHOPPINGCARTOBJ) {
                shpCart.push(d);
                data.Children.splice(i, 1);
            }
        }
        data.Children.sort(function (a, b) {
            return a.Location.X - b.Location.X;
        });
        data.Children = shpCart.concat(data.Children);
    }
    return data;
  };

  public getsvgTooltipData(id: number): Observable<IApiResponse<SvgTooltip[]>> {
    let url = `${this.envConfig.shelfapi}${apiEndPoints.apiForsvgTooltipData}${id}`
    return this.http.get<IApiResponse<SvgTooltip[]>>(url);
  }

  public handleKeyboardEventErrors(err: any, event: KeyboardEvent, isCtrl: boolean, isShift: boolean, isCtrlAndShift: boolean): void {
    const key = event.key.toLocaleLowerCase();
    const msg = (isCtrlAndShift ? 'Ctrl + Shift + ' : (isShift ? 'Shift + ' : (isCtrl ? 'Ctrl + ' : ''))) + key;
    this.log.error(msg + ' ' + this.translate.instant('FAILED'), err);
  }

  public getThumbnail(fileName: string): Observable<IApiResponse<string>> {
    let thumbnailURL = `${this.envConfig.shelfapi}${apiEndPoints.getThumbnail}${fileName}`
    return this.http.get<IApiResponse<string>>(thumbnailURL);
   }

   

}

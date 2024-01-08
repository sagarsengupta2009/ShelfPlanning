import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { forkJoin, Observable, of } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { ConsoleLogService, LocalStorageService } from 'src/app/framework.module';
import { LocalStorageKeys } from 'src/app/shared/constants';
import { SharedService, UserService, PlanogramStoreService, ParentApplicationService } from './../../common';
import { IApiResponse, SvgTooltip, CheckinCheckout, BlockColors, PACheckinCheckOut, PAPogLiteData, PAPSavePogDetails, POGLibraryListItem, PAProductPackageDetails } from 'src/app/shared/models';
import { AllocateEventService } from './allocate-event.service';
import { Section } from 'src/app/shared/classes';

declare const window: any;

@Injectable({
  providedIn: 'root',
})
export class AllocateAPIService {

  constructor(
    private readonly sharedService: SharedService,
    private readonly planogramStore: PlanogramStoreService,
    private readonly httpclient: HttpClient,
    private readonly translateService: TranslateService,
    private readonly user: UserService,
    private readonly parentApp: ParentApplicationService,
    private readonly localStorage: LocalStorageService,
    private readonly log: ConsoleLogService,
    private readonly allocateEvent: AllocateEventService
  ) { }

  private get allocateAppUrl(): string {
    return this.parentApp.allocateAzure.url;
  }
  private get allocateAuthCode(): string {
    return this.parentApp.allocateAzure.code;
  }

  // TODO @karthik use the Planogram Object interface once setup from planogram service.
  public getPlanogramData(pogInfo: POGLibraryListItem) {
    let apis: Observable<any>[] = [];
    const pogID = pogInfo.displayVersion ? pogInfo.displayVersion : pogInfo.IDPOG;
    const user = {
      UserId: this.user.emailId,
    };
    const pType = pogInfo.pogClassificationType;
    const projectId = this.localStorage.get(LocalStorageKeys.PA.SELECTED_SCENARIO)['IdProject'];
    const corpId = this.localStorage.get(LocalStorageKeys.PA.CORP_DETAILS)['IdCorp'];
    let headers = new HttpHeaders();
    headers = headers.append('Content-Type', 'text/plain; charset=utf-8');
    headers = headers.append('emailid', user.UserId);
    headers = headers.append('skipSuccessMsg', 'true');
    apis.push(this.httpclient.post(
      `${this.allocateAppUrl}/api/GetPlanogramJsonResult?code=${this.allocateAuthCode}&pogId=${pogID}&scenarioId=${pogInfo.scenarioID}&isCached=${pogInfo.cached}&corpId=${corpId}&PType=${pType}&projectId=${projectId}`,
      user, { headers, responseType: 'text' }));

    if (this.parentApp.isAllocateAppInResetProjectType) {
      apis.push(
        this.httpclient.get(
          `${this.allocateAppUrl}/api/GetBlocks?code=${this.allocateAuthCode}&pogId=${pogID}&scenarioId=${pogInfo.scenarioID}`,
        ),
      );
    }

    //TODO @karthik need to setup types for PA pog API response.
    return forkJoin(apis).pipe(map((result: [string, []]) => {
      // mock shelf response
      let response: { statusCode: number,message: string,output: any} = JSON.parse(result[0]);
      let pogData, message = "" ;
      if(response.statusCode != 1) {
        pogData = null;
        message = response.message;
      } 
      else {
        pogData = response.output;
        //reset old ids
        for (const item in pogData.PackageInventoryModel) {
          pogData.PackageInventoryModel[item]['id'] = null;
        }
        pogData.globalUniqueID = pogInfo.globalUniqueID;
        pogData.Permissions = pogData.Permissions;
        // TODO @karthik eliminate pogblocks
        pogData.PogBlocks = pogData.PogBlocks ? pogData.PogBlocks : [];
        pogData.Blocks = result[1] ? result[1] : [];
      }
      const pog = {
        Data: pogData,
        Permissions: [],
        Message:message
      };
      return pog;
    }));

  }


  public savePlanogramToCloud(
    details: PAPSavePogDetails,
    data: Blob,
    SVGData: Blob,
    pogLiteData: PAPogLiteData,
  ): Observable<boolean> {
    const idPog = details.pogID;
    let user = {
      UserId: this.user.emailId
    };
    let apis: Observable<string>[] = [];
    const baymapReset = this.allocateEvent.resetBayMapping;
    let headers = new HttpHeaders().set('Content-Type', 'application/json');
    headers = headers.append('Content-Encoding', 'gzip');
    headers = headers.append('emailid', user['UserId']);
    // pog json
    const pogUrl = encodeURI(`${this.allocateAppUrl}/api/SavePlanogram?code=${this.allocateAuthCode}&pogId=${idPog}&scenarioId=${details.scenarioID}&lastTS=${details.dateRefreshed}`);
    apis.push(this.httpclient.post(pogUrl, data, { headers, responseType: 'text' }));
    //svg json
    const svgUrl = encodeURI(`${this.allocateAppUrl}/api/SavePlanogramSVG?code=${this.allocateAuthCode}&pogId=${idPog}&scenarioId=${details.scenarioID}`);
    apis.push(this.httpclient.post(svgUrl, SVGData, { headers, responseType: 'text' }));
    // pog data
    let allocateUrl = encodeURI(`${this.allocateAppUrl}/api/SaveAllocatePlanogramData?code=${this.allocateAuthCode}&scenarioId=${details.scenarioID}&pogId=${idPog}&pogType=${details.pogType}&rulesetId=${details.ruleSetId}&bayMapReset=${baymapReset}`);

    return this.httpclient.post(allocateUrl, pogLiteData, { headers, responseType: 'text' })
      .pipe(
        tap(response => {
          try {
            if (window.parent.updatePogDetails) {
              window.parent.updatePogDetails(JSON.parse(response)[0]);
            }
          } catch (e) {
            console.log(e);
          }

        }),
        switchMap(dataResponse => {
          return forkJoin(apis)
            .pipe(map((blobResponse) => {
              if (blobResponse[0] && blobResponse[1]) {
                return true;
              } else {
                return false;
              }
            }));
        }),
        catchError((error) => {
          this.log.error(error);
          return of(false);
        })
      )
  }

  public getPlanogramSvg(currObj: POGLibraryListItem): Observable<SvgTooltip[]> {
    const pogID = currObj.displayVersion ? currObj.displayVersion : currObj.IDPOG;
    const random = Math.random().toString(36).substring(7);
    const url = encodeURI(
      `${this.allocateAppUrl}/api/GetPlanogramImage_ToolTip`
      + `?code=${this.allocateAuthCode}`
      + `&pogId=${pogID}&imageType=1&scenarioId=${currObj.scenarioID}`
      + `&cached=${currObj.cached}&rnd=${random}&type=${currObj.pogClassificationType}`);

    return this.httpclient.get<SvgTooltip[]>(url);
  }

  public checkinCheckoutPog(requestCollection): Observable<IApiResponse<CheckinCheckout>> {
    const AppSettingsSvc = this.planogramStore.appSettings;
    const displayVersion = requestCollection.data[0].displayVersion
      ? requestCollection.data[0].displayVersion
      : requestCollection.data[0].IDPOG;
    const pogID = requestCollection.data[0].IDPOG;
    let pType = window.parent.mode == 'manual' ? 'Model' : 'SSPOG';
    pType = window.parent.optimizeMode ? 'Manual' : pType;
    let url = `${this.allocateAppUrl}/api/CheckInCheckOutpog?code=${this.allocateAuthCode}`;
    url = encodeURI(
      `${url}&pogId=${displayVersion}&userid=${AppSettingsSvc.userProfile.EmailId}&checkout=${requestCollection.IsCheckedOut
      }&scenarioId=${this.sharedService.getActiveSectionId()}&pogType=${pType}`,
    );

    return this.httpclient.get(url).pipe(
      map((response: PACheckinCheckOut) => {
        return this.processPACheckinCheckout(response, pogID);
      }),
    );
  }

  public getBlockColors(blocks: string): Observable<BlockColors> {
    const headers = new HttpHeaders().set('Content-Type', 'application/json');
    return this.httpclient.post<BlockColors>('/api/pogblocks/GetPogBlockColor', blocks, { headers });
  }

  // response : new pog id.
  public clonePlanogram(pog): Observable<number> {
    const url = encodeURI(
      this.allocateAppUrl + '/api/CloneModelPogAndGetLayoutPog'
      + '?code=' + this.allocateAuthCode
      + '&scenarioId=' + pog.IdScenario,
    );
    return this.httpclient.post<number>(url, pog);
  }

  public updateNpiItem(data: { "productKeys": string[] }): Observable<string> {
    const sceanrioID = this.planogramStore.scenarioId;
    const url = encodeURI(`${this.allocateAppUrl}/api/SetupNpiItem?code=${this.allocateAuthCode}&scenarioId=${sceanrioID}`);
    let headers = new HttpHeaders().set('Content-Type', 'text/plain');
    headers = headers.append('skipSuccessMsg', 'true');
    return this.httpclient.post<string>(url, data, { headers, responseType: 'text' as 'json' })
      .pipe(
        tap(res => window.parent.refreshAllProducts = true),
        catchError(err => {
          window.parent.toastMessage('Item did not update on Azure correctly!')
          return "";
        })
      );
  }

  public validateProductsForCorp(data: { productKeys: string[], targetCorpId: number, sourceCorpId: number }): Observable<PAProductPackageDetails[]> {
    const scenarioId = this.planogramStore.scenarioId;
    let headers = new HttpHeaders();
    headers = headers.append('skipSuccessMsg', 'true');
    const url = `${this.allocateAppUrl}/api/GetAvailableProductPackageDetails?code=${this.allocateAuthCode}&scenarioId=${scenarioId}`;
    return this.httpclient.post<PAProductPackageDetails[]>(url, data, { headers });
  }

  public setupProductForDivision(data: { productKeys: string[], targetCorpId: number, sourceCorpId: number }): Observable<PAProductPackageDetails[]> {
    const scenarioId = this.planogramStore.scenarioId;
    let headers = new HttpHeaders();
    headers = headers.append('skipSuccessMsg', 'true');
    const url = `${this.allocateAppUrl}/api/SetupNPIItemsForTargetCorp?code=${this.allocateAuthCode}&scenarioId=${scenarioId}`;
    return this.httpclient.post<PAProductPackageDetails[]>(url, data, { headers });
  }

  private processPACheckinCheckout(response: PACheckinCheckOut, pogID: number): IApiResponse<CheckinCheckout> {
    const AppSettingsSvc = this.planogramStore.appSettings;
    const token = {
      jsonAccessInfo: response.jsonAccessInfo,
      svgAccessInfo: response.svgAccessInfo,
    };
    const mockResponse = {
      canEdit: false,
      userId: response.checkedOutTo,
      idPog: pogID,
      message: this.translateService.instant('THE_POG_IS_BEING_EDITED_BY') + ' ' + response.checkedOutTo + '',
      azureBlobToken: token,
    };
    if (response.checkedOutTo == AppSettingsSvc.userProfile.EmailId) mockResponse.canEdit = true;
    else mockResponse.canEdit = false;
    const res = { Data: mockResponse, Permissions: '' };
    return res;
  }
}

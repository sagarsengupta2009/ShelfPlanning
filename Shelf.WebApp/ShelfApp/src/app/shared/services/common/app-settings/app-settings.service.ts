import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ConsoleLogService } from 'src/app/framework.module';
import { SettingNames as SETTINGS } from 'src/app/shared/constants'
import { apiEndPoints, ApplicationSettings, AppSettings, AssortConfig, IApiResponse } from 'src/app/shared/models';
import { ConfigService } from '../../common/configuration/config.service';
@Injectable({
  providedIn: 'root'
})
export class AppSettingsService {

  constructor(
    private readonly httpClient: HttpClient,
    private readonly log: ConsoleLogService,
    private readonly envConfig: ConfigService
  ) { }

  public getSettings(): Observable<ApplicationSettings> {
    return this.httpClient.get<IApiResponse<ApplicationSettings>>(`${this.envConfig.shelfapi}${apiEndPoints.getAllSettingObjects}`)
      .pipe(
        map(result => {
          if (!result?.Data) {
            this.log.warning('getAllSettingObjects API failed.');
            return null;
          }
          return result.Data;
        }),
      );
  }

  public getAppSettingsByNameData(keyName: string, keyGroup: string): Observable<string> {
    return this.getSettingByNameApiData(keyName, keyGroup)
      .pipe(
        map(response => this.validateAndGetData(response, keyName))
      );
  }

  public getAppSettingsByName<T>(keyName: string, keyGroup: string): Observable<T> {
    return this.getSettingByName<T>(keyName, keyGroup);
  }

  public saveSettings(data: AppSettings, ignoreSpinner: boolean = false, skipSuccessMsg: boolean = false): Observable<boolean> {
    let headers = new HttpHeaders();
    headers.set('Content-Type', 'application/json');
    headers = headers.append('ignoreLoader', ignoreSpinner === true ? 'true' : 'false');   
    headers = headers.append('skipSuccessMsg', skipSuccessMsg === true ? 'true' : 'false'); 
    return this.httpClient.post<IApiResponse<string>>(`${this.envConfig.shelfapi}${apiEndPoints.apiPathToSaveAppSettings}`, data, { headers })
      .pipe(
        // Check API completed without any error
        map(result => result?.Data && result.Log.Summary.Error === 0)
      );
  }

  public getDefaultAppSettingsValue(entity: string): boolean | number | string | object {
    switch (entity) {
      case 'DISABLE_DELETED_SCITEM':
        return true;
      case 'AUTOSAVE_TIMER':
        return 1;
      case 'PROMPT_BEFORE_POGSAVE':
        return true;
      case 'AUTOSAVE_IS_ENABLE':
        return true;
      case 'DAYS_IN_MOVEMENT':
        return 7;
      case 'VIEW_MODE_DEFAULT':
        return 2;
      case 'SAVE_IS_ENABLE':
        return true;
      case 'HIGHLIGHT_POGLOAD_TEMPLATE':
        return 'ADRI';
      case 'CLIENT_LOGSERVICE_ROW_LIMIT':
        return 1000;
      case 'CLIENT_LOGGER_MODE':
        return 1;
      case 'COMPUTE_TGT_INVENTORYVALUES':
        return false;
      case 'BACKCOLOR': return '#ffffff';
      case 'STATUSBAR_ISCUSTOM':
        return true;
      case 'LOCAL_STOREAGE_IS_ENABLE':
        return true;
      case 'IS_PROJECT_PRODUCT_SEARCH':
        return false;
      case 'ASYNC_SAVE_FLAG':
        return false;
      case 'TURNON_ASYNC_SAVE': return false;
      case 'ASYNC_SAVE_CAP': return 3;
      case 'FITCHECKTOLERANCE': return 0.0005;
      case 'SEC_WID_REDUCN_FIX_LIMIT': return 10;
      case 'POS_LOCK_IDDICTIONARY': return 'positoinLockFlag';
      case 'AUTOMATION_ON':
        return false;
      case 'TURNOFF_CHECKOUT':
        return 1;
      case 'FIX_CNTRL_SNAP_MOVE':
        return false;

      case 'NOT_ALLOWED_ASSORT_ARRY':
        /*//Not to change default behaviour of the iShelf Lite
        for false values it should behave like normal shelf
        */
        const parentAppConfig: AssortConfig = {
          'footer': true,
          'header': true,
          'header-panel-view': true,
          'header-3D-fixture': true,
          'header-permission': true,
          'header-tools': true,
          'header-pog-sync': true,
          'header-report-template': true,

          'Fixture-delete': true,
          'Position-delete': true,
          'save-planogram-template': true,
          'pog-auto-load': true,
          'drag-Y-direction': true,
          'tools': true,
          'NPI': true,
          'clone-pog-lib': true,

          'new-position-add': true,
          'create-new-pog': true,
          'create-new-pog-append': true,
          'new-fixture-add': true,

          '3D-worksheet-edit': true,
          'Fixture-worksheet-edit': true,
          'item-worksheet-edit': true,
          'propertygrid-edit': true,

          'panel-header': true,
          'report-show': true,
          'store-premission': true,
          'performance-permission': true,
          'assign-store': true,
          'pin-unpin': true,
          'signalR': true
        };
        return JSON.stringify(parentAppConfig);

      case 'NICI_FEATURE_NO_ALLOWED':
        return JSON.stringify({
          'PASTE': false,
          'COPY': true,
          'CUT': true,
          'FLIP': true,
          'MOVEPOS': false,
          'MOVEFIX': true,
          'FACINGSCHANGE': false,
          'ROLLUPDOWN': true,
          'MOVEMODULAR': true,
          'DELETE': false,
          'ADDMODULAR': true,
          'SPLITSECTION': true,
          'ITEM_WORKSHEET_EDIT': false,
          'FIXTURE_EDIT': true,
          'CROSSBAR_CRUNCH': true,
          'FIXTURE_PROPERTY_GRID': true,
          'POSITION_PROPERTY_GRID': true,
          'SECTION_PROPERTY_GRID': true
        });

      case 'NOT_ALLOW_EDIT_ASSORT':
        return true;

      case 'SKIP_STOREVIEW_PREVIEW':
        return true;

      case 'ANCHORING_FLAG':
        return {
          'sappPropertyGridDialog': { 'pinned': false },
          'sappHighlightTool': { 'pinned': false },
          'sappShoppingCartDialog': { 'pinned': false, pos: 'right' },
          'sappProductsSearchListDialog': { 'pinned': false },
          'sappCharts': { 'pinned': false }
        };

      case 'USER_DEFAULTS.POG.SHELF_AUTO_LOAD_POG':
        return true;

      case 'STATUSBAR_SETTINGS':
        return {
          SelectedValue: {
            value: {
              position: ['2666', '389', '244'],
              pog: ['4005'],
              fixture: ['319', '321']
            }
          }
        };

      case 'SHOW_MAX_POGHIER_NODE_LEVEL':
        return 2;

      case 'MAX_POG_COUNT': return -1;

      case 'POG_ROUNDOFF': return 0;

      case SETTINGS.Measurement: return 'METRIC';
      case SETTINGS.IsTooltipOff: return false;
      case 'USER_DEFAULTS.POG.PROPERTYGRID_VIEW_SETTING'  :return 1;
      case 'SC_SORT_FIELD_ORDER':
        return {
          SelectedValue: {
            value: [{ field: 'Position.RecommendationNumber', name: 'Recommendation', order: 1, dir: 'asc' }]
          }
        };
      case 'CAN_VALIDATE_PEGGABLE': return false;
      case 'ADVANCEDTRAY_DEFAULTCAPPING': return 1;
      default:
        return null;
    }
  }

  private getSettingByNameApiData(keyName: string, keyGroup: string): Observable<IApiResponse<string>> {
    const url = `${this.envConfig.shelfapi}${apiEndPoints.apiPathToGetSettingByName}keyName=${keyName}&keyGroup=${keyGroup}`;
    return this.httpClient.get<IApiResponse<string>>(url)
      .pipe(
        catchError((error: HttpErrorResponse) => {
          this.log.error(`Error while loading  ${keyName}, error:`, error);
          return of(null);
        })
      );
  }

  private getSettingByName<T>(keyName: string, keyGroup: string): Observable<T> {
    return this.getSettingByNameApiData(keyName, keyGroup)
      .pipe(
        map(response => this.validateAndConvertTo<T>(response, keyName)),
         catchError(error => { this.log.error(`Error while loading  ${keyName}, error:`, error);
         return of(null); }),
      );
  }

  private validateAndGetData(response: IApiResponse<string>, keyName: string): string {
    if (response?.Data) {
      return response.Data
    } // else
    this.log.warning(`No response data for '${keyName}'`);
    return '';
  }

  private validateAndConvertTo<T>(response: IApiResponse<string>, key: string): T {
    const data = this.validateAndGetData(response, key);
    return (data ? JSON.parse(response.Data) : null) as T
  }

}

import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SettingNames as SETTINGS } from 'src/app/shared/constants'
import { AllSettings, apiEndPoints, IApiResponse, CustomSearchSchema, SearchTypeName, RawSearchSetting, SettingsValueOption } from 'src/app/shared/models/';
import { PlanogramStoreService } from 'src/app/shared/services';
import { ConfigService } from 'src/app/shared/services/common/configuration/config.service';

@Injectable({
  providedIn: 'root'
})
export class SearchSettingService {

  constructor(
    private readonly http: HttpClient,
    private readonly envConfig: ConfigService,
    private readonly planogramStore: PlanogramStoreService
  ) { }

  public savePogSettings(data: AllSettings[]): Observable<IApiResponse<string>> {
    const header = new HttpHeaders().set('Content-Type', 'application/json');
    return this.http.
      post<IApiResponse<string>>(`${this.envConfig.shelfapi}${apiEndPoints.apiPathSavePogSettings}`, JSON.stringify(data), {
        headers: header
      });
  }

  public getCustomSearchOption(type: SearchTypeName): RawSearchSetting | undefined {
    const settingValue = this.getSearchSetting<string>('CUSTOM_SEARCH_SCHEMA');

    if (!settingValue) { return undefined; }
    const options: CustomSearchSchema = JSON.parse(settingValue);

    switch (type) {
      case SearchTypeName.PRODUCT:
        return options.Product[0];
      case SearchTypeName.FIXTURE:
        return options.Fixture[0];
      case SearchTypeName.PLANOGRAM:
      default: return options.Planogram[0];
    }
  }

  public getFieldDescription(type: SearchTypeName, field: string): string {
    const rawFieldOptions = this.getCustomSearchOption(type);
    const fieldDescription = rawFieldOptions[field] ? rawFieldOptions[field] : field;
    return fieldDescription;
  }

  public getSetting(settingName: string): AllSettings {
    const allSettings = this.planogramStore.allSettings;
    return allSettings.GetAllSettings.data.find(pObj => pObj.KeyName === settingName);
  }

  /**
   * Get the selected search field or mode
   * @param settingName
   * @returns SelectedValue.value
   */
  public getSearchSetting<T>(settingName: string): T {
    const setting = this.getSetting(settingName);
    if (!setting) { return undefined; }
    return setting.SelectedValue.value as unknown as T;
  }

  public getSearchSettingsNames(searchType: SearchTypeName): { ModeKey: string, FieldKey: string } {
    switch (searchType) {
      case SearchTypeName.PRODUCT:
        return SETTINGS.Search.PRODUCT;
      case SearchTypeName.FIXTURE:
        return SETTINGS.Search.Fixture;
      case SearchTypeName.PLANOGRAM:
      default:
        return SETTINGS.Search.PLANOGRAM;
    }
  }

}

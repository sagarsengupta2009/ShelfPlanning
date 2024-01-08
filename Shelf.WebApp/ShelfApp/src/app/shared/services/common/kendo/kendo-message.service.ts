import { Injectable } from '@angular/core';
import { filter } from 'rxjs/operators';
import { TranslateService } from '@ngx-translate/core';
import { MessageService } from '@progress/kendo-angular-l10n';
import { ConsoleLogService } from 'src/app/framework.module';
import { LanguageService } from 'src/app/shared/services';

// not exporting as this is supposed to be used only with in this file.
/** Represents kendo grid specific key to application key mapping */
const keyMapping = {
  'kendo.grid.noRecords': 'NORECORDS',
  'kendo.grid.sortAscending': 'SORTASC',
  'kendo.grid.sortDescending': 'SORTDESC',
  'kendo.grid.columns': 'COLUMNS',
  'kendo.grid.filter': 'FILTER',
  'kendo.grid.filterClearButton': 'PP_CLEAR',
  'kendo.grid.filterFilterButton': 'FILTER',
  'kendo.grid.groupPanelEmpty': 'EMPTYGROUPPANE',
  'kendo.grid.columnsApply': 'COLUMNSAPPLY',
  'kendo.grid.columnsReset': 'COLUMNSRESET',
};

@Injectable({
  providedIn: 'root'
})
export class KendoMessageService extends MessageService {

  private translationMap: Map<string, string> = null;

  constructor(
    private readonly translate: TranslateService,
    private readonly log: ConsoleLogService,
    private readonly language: LanguageService
  ) {
    super();
    this.language.onReady
      .pipe(filter(isReady => isReady))
      .subscribe(() => {
        this.populateTranslationMap();
      });
  }

  //#region MessageService implementation
  public get(key: string): string {
    return this.getTranslation(key);
  }
  //#endregion MessageService implementation

  private getTranslation(key: string): string {
    if (this.translationMap.has(key)) {
      return this.translationMap.get(key);
    }
    return undefined;
  }

  private populateTranslationMap(): void {
    this.translationMap = new Map<string, string>();

    // Let's populate all the custom translations at once. 
    // Second time data served from translationMap
    for (const key in keyMapping) {
      const translatedText = this.calculateTranslation(key);
      this.translationMap.set(key, translatedText);
    }
  }

  private calculateTranslation(key: string): string {

    //  key is specific to Kendo Grid. Convert it to application label key
    const labelKey = keyMapping[key];

    if (labelKey) {
      const translation = this.translate.instant(labelKey);
      if (translation !== labelKey) {
        return translation;
      }
      // Either Translation Loader failed OR Missing key.
      this.log.warning(`KendoMessageService: Message Translation failed for kendo-key: '${key}', labelKey: '${labelKey}'.`);
    }

    // application label key or translation not available, let kendo use the default value
    return undefined;
  }

}

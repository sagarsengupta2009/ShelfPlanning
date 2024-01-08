import { Inject, Injectable, LOCALE_ID } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, zip, Subscription } from 'rxjs';
import { map, tap, catchError, filter } from 'rxjs/operators';
import * as _ from 'lodash';
import { TranslateService } from '@ngx-translate/core';
import { TranslateCacheService } from '@haidar-h/ngx-translate-cache';
import { OnReady } from 'src/app/framework.module';
import { ConsoleLogService, LocalStorageService } from 'src/app/framework.module';
import { ConfigService } from '../configuration/config.service';
import { LabelArray } from 'src/app/shared/models';
import { LocalStorageKeys } from 'src/app/shared/constants';
import { UserService, AppSettingsService } from 'src/app/shared/services';
import { IntlService, CldrIntlService } from "@progress/kendo-angular-intl";
import { registerLocaleData } from '@angular/common';
import localeDe from '@angular/common/locales/de';
import localeDeExtra from '@angular/common/locales/extra/de';
import localeFr from '@angular/common/locales/fr';
import localeDk from '@angular/common/locales/da';
import localeRu from '@angular/common/locales/ru';
import localePt from '@angular/common/locales/pt';
import localeSv from '@angular/common/locales/sv';
import localeIt from '@angular/common/locales/it';
import localeEs from '@angular/common/locales/es';
import localeNl from '@angular/common/locales/nl';
import localeEe from '@angular/common/locales/ee';
import localeLv from '@angular/common/locales/lv';
import localeLt from '@angular/common/locales/lt';
import localeEn from '@angular/common/locales/en';

// Not exporting, as this is used only within this file.
interface INotificationCount {
  NotificationCount: number;
  AppVersion: string;
  Language: string;
}

@Injectable({
  providedIn: 'root'
})
export class LanguageService extends OnReady {

  public subscriptions: Subscription = new Subscription();
  // Local storage key
  private readonly languageKey = LocalStorageKeys.LANGUAGE;
  private currentLanguage = '';
  private currentDateFormatSource: string = 'language';
  private currentDateFormat: string = '';
  private currentTimeFormat: string = '';

  constructor(
    private readonly http: HttpClient,
    private readonly config: ConfigService,
    private readonly localStorage: LocalStorageService,
    private readonly translate: TranslateService,
    private readonly translateCacheService: TranslateCacheService,
    private readonly log: ConsoleLogService,
    private readonly userService: UserService,
    private readonly appSettingsService: AppSettingsService,
    @Inject(LOCALE_ID) public localeId: string,
    public intlService: IntlService
  ) {
    super();
  }

  /** initialize language / translation services */
  public init(): Observable<string> {
    const language$ = this.getTranslationLanguage();
    const translations$ = this.getTranslations();
    this.getDateFormatSource();

    const combined$ = language$
      .pipe(
        source => zip(source, translations$),
        map(result => ({ language: result[0], translations: result[1] })),
        tap(result => this.setupTranslation(result.language, result.translations)),
        map(result => result.language)
      );
    return combined$;
  }

  /** get current language */
  public get(): string {
    return this.getLanguage();
  }

  private getTranslationLanguage(): Observable<string> {
    const savedLanguage = this.getLanguage();
    if (savedLanguage) { 
      return of(savedLanguage); 
    }

    // no saved language, call API
    const url = '/api/common/GetNotificationCount';
    return this.http.get<INotificationCount>(url)
      .pipe(
        map(result => result.Language),
        catchError(error => this.handleApiError(error)),
        tap(language => this.saveLanguage(language))
      );
  }

  private getDateFormatSource(): void {
    this.subscriptions.add(
      this.appSettingsService.getAppSettingsByName<{ source: string }>('DATE_FORMAT_SOURCE', 'POG')
        .subscribe((res: { source: string }) => {
          if (res?.source) this.currentDateFormatSource = res.source;
        }));
  }

  private handleApiError(error: any): Observable<string> {
    this.log.error('Language name API call failed', error);
    return of(''); // default value
  }

  private setupTranslation(lang: string, translations: LabelArray): void {
    // usage reference: https://www.npmjs.com/package/ngx-translate-cache
    this.translate.setDefaultLang(lang);
    this.translate.setTranslation(lang, translations);
    this.translateCacheService.init();
    this.notifySubscribers();
  }

  private getTranslations(): Observable<LabelArray> {
    return this.config.onReady.pipe(
      filter(isReady => isReady), // service ready
      map(() => (this.config.allLabels)) // read labels from ConfigService
    );
  }

  private getLanguage(): string {
    if (this.currentLanguage) { return this.currentLanguage; }
    this.currentLanguage = this.localStorage.getValue(this.languageKey);
    this.setupLocalId();
    return this.currentLanguage;
  }

  private saveLanguage(language: string): void {
    if (language) {
      this.currentLanguage = language;
      this.setupLocalId();
      this.localStorage.setValue(this.languageKey, language);
    } 
  }
//ToDo: Have to make this function dynamic
  private setupLocalId(): void {
    if (this.currentLanguage) {
      this.localeId = this.currentLanguage;
      (<CldrIntlService>this.intlService).localeId = this.currentLanguage;
      let localeVal = {
        'de-DE': localeDe,
        'fr-FR': localeFr,
        'pt-BR': localePt,
        'ru-RU': localeRu,
        'da-DK': localeDk,
        'sv-SE': localeSv,
        'it-IT': localeIt,
        'lv-LV': localeLv,
        'lt-LT': localeLt,
        'es-ES': localeEs,
        'nl-NL': localeNl,
        'et-EE': localeEe,
      }[this.localeId];
      if (localeVal) {
        registerLocaleData(localeVal, this.localeId, localeDeExtra);
      }
      else{//Defaulting to en-US if it's not part of above languages
        this.localeId="en-US";
        (<CldrIntlService>this.intlService).localeId = this.localeId;
        registerLocaleData(localeEn,this.localeId);
      }
    }
  }

  public getTimeFormat(): string {
    if (this.currentTimeFormat) { return this.currentTimeFormat; }
    this.currentTimeFormat = this.userService.time12or24 === 24 ? "HH:mm" : "h:mm a";
    return this.currentTimeFormat;
  }

  public getDateFormat(): string {
    if (this.currentDateFormat) { return this.currentDateFormat; }
    switch (this.currentDateFormatSource.toLowerCase()) {
      case "system":
        this.currentDateFormat = this.getLocaleDateFormat(navigator.language);
        break;
      case "language":
      default:
        this.currentDateFormat = this.getLocaleDateFormat(this.getLanguage());
        break;
    }
    return this.currentDateFormat;
  }

  private getLocaleDateFormat(locale: string = undefined): string {
    let date: Date = new Date(2019, 0, 8);
    let dateString: string = date.toLocaleDateString(locale);
    let pieces: string[] = dateString.match(/\d+/g);
    let format: string = dateString;
    pieces.forEach((piece: string) => {
      let dmy: string;
      switch (Number.parseInt(piece)) {
        case 2019:
        case 19:
          dmy = "y"
          break;
        case 1:
          dmy = "M"
          break;
        case 8:
          dmy = "d"
          break;
      }
      format = format.replace(piece, dmy.repeat(piece.length));
    });
    return format;
  }
}

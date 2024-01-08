import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { forkJoin, Observable, of, zip } from 'rxjs';
import { map, tap, switchMap } from 'rxjs/operators';
import { environmentConfig } from 'src/environments/environment';
import { LocalStorageKeys } from 'src/app/shared/constants';
import { LocalStorageService, OnReady, ConsoleLogService } from 'src/app/framework.module';
import {
    ApplicationResources, ApplicationGridList, LabelArray,
    ApplicationMenu, ScreenMenus, MenuItem,
    AppVersion, apiEndPoints
} from 'src/app/shared/models';
import { db } from 'src/app/framework.module/db/db';
import { LicenseManager } from 'ag-grid-enterprise';
import { GridColumnSettings } from 'src/app/shared/components/ag-grid/models';
import { NotifyService } from '../notify/notify.service';
import { TranslateService } from '@ngx-translate/core';
declare const window: any;
//#region model interfaces

// Not exporting, these interfaces as these are used within this file only.
interface EnvironmentReponse {
    ApiUrl: string;
    ApiCode: string;
    ApplicationUrl: string;
    StorageBlobUrl: string;
    AgLicense: string;
    ShelfApi: string;
    FallbackImageURL:string;
}
interface EnvironmentConfig {
    production: boolean;
    azureURL: string;
    applicationUrl: string;
    apiKey: string;
    blobURL: string;
    deploymentPath: string;
    agLicense: string;
    shelfapi: string;
    fallbackimageURL:string;
}

interface INotificationCount {
    NotificationCount: number;
    AppVersion: string;
    Language: string;
}

/** This is an platform API which provides the walkme details.
 *  It contains many dynamic key values with all different data types.
  */
interface BroadcasteMessage {
    [key: string]: any;
}

//#endregion model interfaces

@Injectable({
    providedIn: 'root',
})
export class ConfigService extends OnReady {

    private environment: EnvironmentConfig = null;

    private translationLabels: LabelArray = null;
    private allGridColumnConfigs: ApplicationGridList = null;
    /** Holds the gridName to menuItem mapping for the entire application. */
    private menuMap: Map<string, MenuItem[]> = null;
    private appMenus: ApplicationMenu[] = null;

    public get applicationUrl(): string {
        return this.environment.applicationUrl;
    }
    public get azureUrl(): string {
        return this.environment.azureURL;
    }
    public get apiKey(): string {
        return this.environment.apiKey;
    }
    public get blobUrl(): string {
        return this.environment.blobURL;
    }
    public get deploymentPath(): string {
        return this.environment.deploymentPath;
    }

    public get allLabels(): LabelArray {
        return this.translationLabels;
    }

    public get shelfapi(): string {
        return this.environment.shelfapi;
    }
    public get fallbackImageUrl(): string {
        return this.environment.fallbackimageURL;
    }

    constructor(
        private readonly http: HttpClient,
        private readonly localStorage: LocalStorageService,
        private readonly log: ConsoleLogService,
        private readonly notify: NotifyService,
        private readonly translate: TranslateService
    ) {
        super();
    }

    /**
     * Application configuration loader function. This is used as APP_INITIALIZER.
     * Return type doesn't have any significance to the application.
     */
    public loadAppConfig(): Observable<any> {

        const envConfig$ = this.loadEnvironmentConfig();
        const appResources$ = this.loadAppResources();

        return envConfig$.pipe(
            source => zip(source, appResources$),
            // both environment config and application resource load completed
            tap(() => this.notifySubscribers())
        );
    }

    public getGridColumns(gridName: string): GridColumnSettings[] {
        const columns = this.allGridColumnConfigs[gridName] as GridColumnSettings[];
        if (!columns || !columns.length) {
            this.log.warning(`Column configuration for grid: '${gridName}' missing.`);
            return [];
        }
        return columns;
    }
    public getGridColumn(gridName: string, columnName: string): GridColumnSettings {
        const columns = this.getGridColumns(gridName);
        if (columns?.length) {
            const column = columns.find(x => x[0] === columnName);
            return column;
        }
        return null;
    }

    public getGridMenus(gridName: string): MenuItem[] {
        const menus = this.menuMap.get(gridName);
        if (menus?.length) { return menus; }

        this.log.warning(`Grid Menus not defined for grid: '${gridName}'`);
        return [];
    }

    public getScreenMenus(screenName: string, controlName: string): ScreenMenus {
        screenName = screenName.toLocaleLowerCase();
        controlName = controlName.toLocaleLowerCase();

        const appMenu = this.appMenus.find(x => x.screenName.toLocaleLowerCase() == screenName);
        const screenMenus = appMenu?.controlName.find(x => x.name.toLowerCase() === controlName);
        return screenMenus;
    }

    // TODO @karthik eliminate any once ag-grid config is finalized
    public saveGridColumns(gridName: string, updatedGrid: GridColumnSettings[] | any): void {
        const appResource: ApplicationResources = this.localStorage.get(LocalStorageKeys.APP_RESOURCES);
        appResource.grid[gridName] = updatedGrid;
        this.updateAllGridConfig(appResource.grid);
        this.localStorage.set(LocalStorageKeys.APP_RESOURCES, appResource);
    }

    private loadEnvironmentConfig(): Observable<EnvironmentReponse> {
        // Currently these vaules are not being used within the application.
        // But as we setup other environments / refactor parent apps, this code is needed.
        return this.http
            .get<EnvironmentReponse>(environmentConfig.environmentFilePath)
            .pipe(tap(response => this.saveEnvironmentConfig(response)));
    }

    private saveEnvironmentConfig(response: EnvironmentReponse) {
        this.environment = {
            production: environmentConfig.production,
            azureURL: response.ApiUrl,
            apiKey: response.ApiCode,
            applicationUrl: response.ApplicationUrl,
            blobURL: response.StorageBlobUrl,
            deploymentPath: environmentConfig.deploymentPath,
            agLicense: response.AgLicense,
            shelfapi: response.ShelfApi,
            fallbackimageURL: response.FallbackImageURL
        };
        this.activateAgLicense();
    }

    private activateAgLicense(): void {
        if (this.environment.agLicense) {
            LicenseManager.setLicenseKey(this.environment.agLicense)
        } else {
            this.log.info("Ag-grid license missing!");
        }
    }

    private loadAppResources(): Observable<ApplicationResources> {
        const localData$ = this.loadLocallySavedAppResources(); // from localStorage
        const appVersion$ = this.getCurrentAppVersion(); // from API
        const appLanguage$ = this.getCurrentAppLanguage();
        return localData$
            .pipe(
                source => zip(source, appVersion$, appLanguage$),
                switchMap(result => this.swichBetweenLocalOrApiData(result[0], result[1], result[2]))
            );
    }

    private swichBetweenLocalOrApiData(localAppResources: ApplicationResources, appVersion: string, appLanguage: string): Observable<ApplicationResources> {
        const localVersion = this.localStorage.getValue(LocalStorageKeys.VERSION);
        if (localAppResources) {
            const localLanguage = this.localStorage.getValue(LocalStorageKeys.LANGUAGE);
            const canUseLocal = localVersion === appVersion && localLanguage === appLanguage;
            if (canUseLocal) {
                this.log.info(`using local appResources data, localVersion: ${localVersion}`);
                const walkmeEnabled = this.localStorage.getValue(LocalStorageKeys.WALKEME_ENABLED);
                const walkmeURL = this.localStorage.getValue(LocalStorageKeys.WALKME_URL);
                this.setAppResources(localAppResources, {walkmeEnabled, walkmeURL});
                return of(localAppResources);
            }
        }
        if (localVersion != null && localVersion !== appVersion) {
            this.setupLocalTranslation();
            this.notify.warn("NEW_VERSION_UPDATE_MESSAGE");
            setTimeout(() => {
                this.localStorage.clearParticulars(); //Sagar: To clear the shelf specific keys
                window.location.reload();
            }, 4000);
        }
        // else local data not found OR version miss-match
        return this.loadAllResources(localVersion, appVersion, appLanguage);
    }

    private loadLocallySavedAppResources(): Observable<ApplicationResources> {
        const savedAppResources = this.localStorage.get<ApplicationResources>(LocalStorageKeys.APP_RESOURCES);
        if (savedAppResources) {
            return of(savedAppResources);
        }
        return of(null); // local data not found
    }

    private loadAllResources(currentAppVersion: string, newAppVersion: string, newAppLanguage: string): Observable<ApplicationResources> {
        if (currentAppVersion !== newAppVersion) {
            db.clearDb();
        }
        return forkJoin([this.loadAppResourcesFromApi(),
        this.loadWalkme()])
            .pipe(tap(response => this.saveAppResources(response, newAppVersion, newAppLanguage)))
            .pipe(map(response => { return response[0] }))
    }

    private loadAppResourcesFromApi(): Observable<ApplicationResources> {
        return this.http
            .get<ApplicationResources>(apiEndPoints.getApplicationResources);
    }

    private loadWalkme(): Observable<BroadcasteMessage> {
        return this.http
            .get<BroadcasteMessage>(apiEndPoints.getWalkmeStatus);
    }

    private enableWalkMe(walkmeURL: string): void {
        this.log.info(`Walkme enabled`);
        const walkme = document.createElement('script'); walkme.type = 'text/javascript'; walkme.async = true;
        walkme.src = walkmeURL;
        const s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(walkme, s);
        window._walkmeConfig = { smartLoad: true };
    }

    private saveAppResources(response: [ApplicationResources, BroadcasteMessage], newAppVersion: string, newAppLanguage: string): void {
        const appResources = response[0];
        const walkme = {walkmeEnabled: response[1].WalkMe_ENABLE, walkmeURL: response[1].WalkMeURL};
        this.localStorage.set<ApplicationResources>(LocalStorageKeys.APP_RESOURCES, response[0]);
        this.localStorage.setValue(LocalStorageKeys.VERSION, newAppVersion);
        this.localStorage.setValue(LocalStorageKeys.WALKEME_ENABLED, walkme.walkmeEnabled);
        this.localStorage.setValue(LocalStorageKeys.WALKME_URL, walkme.walkmeURL);
        this.localStorage.setValue(LocalStorageKeys.LANGUAGE, newAppLanguage);
        this.setAppResources(appResources, walkme);
        this.log.info(`Updated appResources data to version: ${newAppVersion}`);
    }

    private getCurrentAppVersion(): Observable<string> {
        return this.http.get<AppVersion[]>(apiEndPoints.getAppVersion)
            .pipe(
                // Application Id 3 is Shelf Planning
                map(result => result.find(x => x.IdApp === 3)?.Versions),
                tap(version => this.log.info(`Shelf Planning version : ${version}`))
            );
    }

    private getCurrentAppLanguage(): Observable<string> {
        const currentLanguage = this.localStorage.getValue(LocalStorageKeys.PLATFORM.LANG);
        if (currentLanguage) {
            return of(currentLanguage);
        }
        return this.http.get<INotificationCount>('/api/common/GetNotificationCount')
            .pipe(
                map(result => result.Language),
                tap(version => this.log.info(`Shelf Planning version : ${version}`))
            );
    }

    private setAppResources(value: ApplicationResources, walkme: {walkmeEnabled: string, walkmeURL: string}): void {
        this.translationLabels = value.lables;
        this.updateAllGridConfig(value.grid);
        // transform the appMenu data into a Map object.
        this.menuMap = this.toMenuMap(value.menu);
        this.appMenus = value.menu;
        if (walkme.walkmeEnabled === 'true') {
            this.enableWalkMe(walkme.walkmeURL);
        }
    }

    private toMenuMap(menu: ApplicationMenu[]): Map<string, MenuItem[]> {
        const menuMap = new Map<string, MenuItem[]>();

        menu.forEach((appMenu: ApplicationMenu) => {
            appMenu.controlName.forEach((screenMenus: ScreenMenus) => {
                menuMap.set(screenMenus.name, screenMenus.menus);
            });
        });

        return menuMap;
    }

    private updateAllGridConfig(gridConfigs: ApplicationGridList): void {
        this.allGridColumnConfigs = gridConfigs;
    }

    private setupLocalTranslation(): void {
        const lang = this.localStorage.getValue(LocalStorageKeys.LANGUAGE);
        const localAppResources = this.localStorage.get<ApplicationResources>(LocalStorageKeys.APP_RESOURCES);
        const translations = localAppResources.lables;
        this.translate.setDefaultLang(lang);
        this.translate.setTranslation(lang, translations);
    }
}

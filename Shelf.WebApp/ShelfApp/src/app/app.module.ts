import { BrowserModule } from '@angular/platform-browser';
import { APP_INITIALIZER, NgModule } from '@angular/core';
import { RouteReuseStrategy } from '@angular/router';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ServiceWorkerModule } from '@angular/service-worker';
import { Observable } from 'rxjs';
import { MaterialModule } from './material-module';
import { DxReportDesignerModule, DxReportViewerModule } from 'devexpress-reporting-angular';
import { MessageService } from '@progress/kendo-angular-l10n';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { TranslateCacheModule, TranslateCacheService, TranslateCacheSettings } from '@haidar-h/ngx-translate-cache';
import { GridModule } from '@progress/kendo-angular-grid';
import { NgxSpinnerModule } from 'ngx-spinner';
import { TooltipModule } from '@progress/kendo-angular-tooltip';
import { environmentConfig } from 'src/environments/environment';
import { ConsoleLogService } from 'src/app/framework.module';
import { LanguageService, KendoMessageService, QuadtreeUtilsService, ConfigService, UserService } from './shared/services';
import { CacheRouteReuseStrategy } from './shared/interceptor/cacheRoute';
import { InterceptorService } from './shared/interceptor/interceptor.service';
import { SharedModule } from './shared/shared.module';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { SpinnerComponent } from 'src/app/shared/components/spinner/spinner.component';
//Kendo language support. Setting default language as 'en-us' in providers
//English-UK
import '@progress/kendo-angular-intl/locales/en-GB/numbers';
import '@progress/kendo-angular-intl/locales/en-GB/calendar';
//English-US
import '@progress/kendo-angular-intl/locales/en/numbers';
import '@progress/kendo-angular-intl/locales/en/calendar';
//French
import '@progress/kendo-angular-intl/locales/fr/numbers';
import '@progress/kendo-angular-intl/locales/fr/calendar';
//Chinese
import '@progress/kendo-angular-intl/locales/zh/numbers';
import '@progress/kendo-angular-intl/locales/zh/calendar';
//German
import '@progress/kendo-angular-intl/locales/de/numbers';
import '@progress/kendo-angular-intl/locales/de/calendar';
//Danish
import '@progress/kendo-angular-intl/locales/da/numbers';
import '@progress/kendo-angular-intl/locales/da/calendar';
//Russian
import '@progress/kendo-angular-intl/locales/ru/numbers';
import '@progress/kendo-angular-intl/locales/ru/calendar';
//Portuguese
import '@progress/kendo-angular-intl/locales/pt/numbers';
import '@progress/kendo-angular-intl/locales/pt/calendar';
//Swedish
import '@progress/kendo-angular-intl/locales/sv/numbers';
import '@progress/kendo-angular-intl/locales/sv/calendar';
//Italian
import '@progress/kendo-angular-intl/locales/it/numbers';
import '@progress/kendo-angular-intl/locales/it/calendar';
//Spanish
import '@progress/kendo-angular-intl/locales/es/numbers';
import '@progress/kendo-angular-intl/locales/es/calendar';
//Dutch
import '@progress/kendo-angular-intl/locales/nl/numbers';
import '@progress/kendo-angular-intl/locales/nl/calendar';
//Estonian
import '@progress/kendo-angular-intl/locales/et/numbers';
import '@progress/kendo-angular-intl/locales/et/calendar';
//Estonian (Estonia)
import '@progress/kendo-angular-intl/locales/ee/numbers';
import '@progress/kendo-angular-intl/locales/ee/calendar';
//Latvian
import '@progress/kendo-angular-intl/locales/lv/numbers';
import '@progress/kendo-angular-intl/locales/lv/calendar';
//Lithuanian
import '@progress/kendo-angular-intl/locales/lt/numbers';
import '@progress/kendo-angular-intl/locales/lt/calendar';

// return type for this method is () => Observable<any>. This is a factory method  to initialize application config
function initializeAppConfig(configService: ConfigService): () => Observable<any> {
  return () => configService.loadAppConfig();
}
function initializeUserInfo(userService: UserService): () => Observable<any> {
  return () => userService.getUserInfo();
}

function initializeUserSettings(userService: UserService): () => Observable<any> {
  return () => userService.getUserSettings();
}

@NgModule({
  declarations: [AppComponent, SpinnerComponent],
  imports: [
    BrowserModule,
    AppRoutingModule,
    BrowserAnimationsModule,
    HttpClientModule,
    ServiceWorkerModule.register('ngsw-worker.js', { enabled: environmentConfig.production }),
    SharedModule,
    GridModule,
    NgxSpinnerModule,
    TooltipModule,
    DxReportDesignerModule,
    DxReportViewerModule,
    MaterialModule,
    FormsModule,
    // TranslateLoader to be injected at the app root
    // https://github.com/ngx-translate/core#usage
    TranslateModule.forRoot(),
    TranslateCacheModule.forRoot({
      cacheService: {
        provide: TranslateCacheService,
        useFactory: (translateService, translateCacheSettings) => {
          return new TranslateCacheService(translateService, translateCacheSettings);
        },
        deps: [TranslateService, TranslateCacheSettings]
      }
    })
  ],
  exports: [],
  providers: [
    {
      provide: HTTP_INTERCEPTORS,
      useClass: InterceptorService,
      multi: true,
    },
    {
      provide: RouteReuseStrategy,
      useClass: CacheRouteReuseStrategy,
    },
    // Refer: https://angular.io/api/core/APP_INITIALIZER#usage-notes
    {
      provide: APP_INITIALIZER,
      useFactory: initializeAppConfig,
      deps: [ConfigService],
      multi: true,
    },
    {
      provide: APP_INITIALIZER,
      useFactory: initializeUserInfo,
      deps:[UserService],
      multi: true
    },
    {
      provide: APP_INITIALIZER,
      useFactory: initializeUserSettings,
      deps:[UserService],
      multi: true
    },
    LanguageService,
    {
      provide: MessageService,
      useClass: KendoMessageService,
      deps: [TranslateService, ConsoleLogService, LanguageService]
    },
    QuadtreeUtilsService,
    ],
  bootstrap: [AppComponent],
})
export class AppModule { }

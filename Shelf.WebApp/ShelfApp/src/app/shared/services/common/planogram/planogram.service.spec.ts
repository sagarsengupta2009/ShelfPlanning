import { TestBed, fakeAsync, tick, waitForAsync } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { HttpClient } from '@angular/common/http';
import { ConfigService } from 'src/app/shared/services/common/configuration/config.service';
import { ErrorHandlerService } from '../errorHandler/error-handler.service';
import { DomSanitizer } from '@angular/platform-browser';
import { SharedService } from 'src/app/shared/services/common/shared/shared.service';
import { ApplicationRef } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarConfig, MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslateService } from '@ngx-translate/core';
import { asyncData } from 'src/test';

import { PlanogramService } from './planogram.service';
import { PlanogramStoreService } from '../planogram-store.service';
import { PlanogramLibraryService } from '../../layouts';
import { ParentApplicationService } from '../parent-app/parent-application.service';
import { UserService } from '../user/user.service';
import { ConsoleLogService } from 'src/app/framework.module';
import { PogSideNavStateService } from '../pog-side-nav-state.service';

describe('PlanogramService', () => {
  let planogramService: PlanogramService;
  let httpClientSpy: { post: jasmine.Spy; get: jasmine.Spy };
  let getApiUrlSpy: jasmine.Spy;
  let snackBarPropertiesSpy: jasmine.Spy;
  let applicationUrlSpy: jasmine.Spy;
  const scenarioDetails = {
    IdScenario: 1150
  };
  const environment = {
    production: '',
    azureURL: 'http://localhost:43000',
    apiKey: '',
    applicationUrl: 'http://localhost:43000',
    blobURL: '',
    deploymentPath: '',
  };
  const ConfigServiceSpy = jasmine.createSpyObj('ConfigService', ['loadConfig', 'environment']);
  const MockErrorHnadlerService = jasmine.createSpyObj('ErrorHandlerService', ['handleError']);
  const MockDomSanitizer = jasmine.createSpyObj('DomSanitizer', ['bypassSecurityTrustHtml']);
  const MockSnackBar = jasmine.createSpyObj('MatSnackBar', ['open']);
  const MockApplicationRef = jasmine.createSpyObj('ApplicationRef', ['tick']);
  const MockDialog = jasmine.createSpyObj('MatDialog', ['open']);
  const MockTranslateService = jasmine.createSpyObj('TranslateService', ['instant']);
  const MockSharedService = jasmine.createSpyObj('SharedService', ['getScenarioDetails', 'changeSplitterOrientation', 'setSnackbarProperties']);
  const MockPlanogramStoreService = jasmine.createSpyObj('PlanogramStoreService');
  const MockPlanogramLibraryService = jasmine.createSpyObj('PlanogramLibraryService');
  const MockParentApplicationService = jasmine.createSpyObj('ParentApplicationService');
  const MockUserService = jasmine.createSpyObj('UserService');
  const MockConsoleLogService = jasmine.createSpyObj('ConsoleLogService');
  const MockPogSideNavStateService = jasmine.createSpyObj('PogSideNavStateService');
  getApiUrlSpy = ConfigServiceSpy.loadConfig.and.returnValue(asyncData(environment));
  applicationUrlSpy = ConfigServiceSpy.environment.and.returnValue(asyncData(environment));
  snackBarPropertiesSpy = MockSharedService.setSnackbarProperties.and.returnValue(asyncData(''));

  beforeEach(waitForAsync(() => {
    // MockSharedService = {
    //  setSnackbarProperties: function () { }
    // };
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, MatSnackBarModule],
      providers: [PlanogramService, MatSnackBarConfig,
        // {
        //  provide: MatSnackBarConfig, useValue: {
        //    panelClass,
        //    horizontalPosition,
        //  }
        { provide: HttpClient },
        { provide: ConfigService, useValue: ConfigServiceSpy },
        { provide: ErrorHandlerService, useValue: MockErrorHnadlerService },
        { provide: DomSanitizer, useValue: MockDomSanitizer },
        { provide: MatSnackBar, useValue: MockSnackBar },
        { provide: ApplicationRef, useValue: MockApplicationRef },
        { provide: MatDialog, useValue: MockDialog },
        { provide: TranslateService, useValue: MockTranslateService },
        { provide: SharedService, useValue: MockSharedService },
        { provide: PlanogramStoreService, useValue: MockPlanogramStoreService },
        { provide: PlanogramLibraryService, useValue: MockPlanogramLibraryService},
        { provide: ParentApplicationService, useValue: MockParentApplicationService },
        { provide: UserService, useValue: MockUserService },
        { provide: ConsoleLogService, useValue: MockConsoleLogService },
        { provide: PogSideNavStateService, useValue: MockPogSideNavStateService }
      ]
    });
    planogramService = TestBed.inject(PlanogramService);
  }));

  beforeEach(() => {
    httpClientSpy = jasmine.createSpyObj('HttpClient', ['post', 'get']);
    planogramService = new PlanogramService(httpClientSpy as any,
      MockSharedService as any,
      MockPlanogramStoreService as any,
      ConfigServiceSpy as any,
      MockTranslateService as any,
      MockDialog as any, 
      MockPlanogramLibraryService as any,
      MockParentApplicationService as any,
      MockUserService as any,
      MockConsoleLogService as any,
      MockPogSideNavStateService as any
      );
  });

  it('should be created', () => {
    expect(planogramService).toBeTruthy();
  });

  it(`should have called setSnackbarProperties`, waitForAsync(() => {
    expect(MockSharedService.setSnackbarProperties).toHaveBeenCalled();
  }));

});

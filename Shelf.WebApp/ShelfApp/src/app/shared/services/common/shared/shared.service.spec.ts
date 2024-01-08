import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { HttpClient } from '@angular/common/http';
import { ConfigService, ParentApplicationService } from '..';
import { ErrorHandlerService } from '../errorHandler/error-handler.service';
import { ValueAtIndexPipe } from 'src/app/shared/pipe';
import { TranslateService } from '@ngx-translate/core';
import { asyncData } from 'src/test';
import { LocalStorageKeys } from 'src/app/shared/constants';
import { SharedService } from './shared.service';
import { LocalStorageService } from 'src/app/framework.module';

describe('SharedService', () => {
  let sharedService: SharedService;
  let httpClientSpy: { post: jasmine.Spy; get: jasmine.Spy };
  let getApiUrlSpy: jasmine.Spy;
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
  const MockTranslateService = jasmine.createSpyObj('TranslateService', ['instant']);

  const MockValueAtIndexPipe = jasmine.createSpyObj('ValueAtIndexPipe', ['transform']);
  const MockParentApplicationService = jasmine.createSpyObj(
    'ParentApplicationService',
    ['isAssortApp', 'isAssortAppInIAssortNiciMode', 'isNiciMode']);
  const MockLocalStorageService = jasmine.createSpyObj('LocalStorageService', ['setValue']);
  getApiUrlSpy = ConfigServiceSpy.loadConfig.and.returnValue(asyncData(environment));
  applicationUrlSpy = ConfigServiceSpy.environment.and.returnValue(asyncData(environment));

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [SharedService,
        { provide: HttpClient },
        { provide: ConfigService, useValue: ConfigServiceSpy },
        { provide: ErrorHandlerService, useValue: MockErrorHnadlerService },
        { provide: TranslateService, useValue: MockTranslateService },
        { provide: ValueAtIndexPipe, useValue: MockValueAtIndexPipe },
        { provide: ParentApplicationService, useVaue: MockParentApplicationService },
        { provide: LocalStorageService, use: MockLocalStorageService }
      ]
    });
    sharedService = TestBed.inject(SharedService);
  });

  beforeEach(() => {
    httpClientSpy = jasmine.createSpyObj('HttpClient', ['post', 'get']);
    sharedService = new SharedService(
      httpClientSpy as any,
      ConfigServiceSpy as any,
      MockErrorHnadlerService as any,
      MockTranslateService as any,
      MockValueAtIndexPipe as any,
      MockParentApplicationService as any,
    );
  });

  it('should be created', () => {
    expect(sharedService).toBeTruthy();
  });

  it('should call changeSearchedText', () => {
    sharedService.changeSearchedText('');
  });


  it('should be able to call setSnackBarProperties', () => {
  });


  it('should call GridValueUpdated', () => {
    sharedService.GridValueUpdated(true);
    expect(sharedService.badgeVisible).toEqual(true);
    expect(sharedService.isGridEditing).toEqual(true);
  });
});

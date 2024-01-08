import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { KendoService } from './kendo.service';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { asyncData, asyncError } from 'src/test';
import { ConfigService } from '../configuration/config.service';
import { UserService } from '../user/user.service';

describe('SecretService', () => {
  let kendoService: KendoService;
  let httpClientSpy: { post: jasmine.Spy };
  let getApiUrlSpy: jasmine.Spy;
  let applicationUrlSpy: jasmine.Spy;
  const environment = {
    production: '',
    azureURL: 'http://localhost:43000',
    apiKey: '',
    applicationUrl: 'http://localhost:43000',
    blobURL: '',
    deploymentPath: '',
  };
  const ConfigServiceSpy = jasmine.createSpyObj('ConfigService', ['loadConfig', 'environment']);
  getApiUrlSpy = ConfigServiceSpy.loadConfig.and.returnValue(asyncData(environment));
  applicationUrlSpy = ConfigServiceSpy.environment.and.returnValue(asyncData(environment));
  let envConfigSpy: jasmine.Spy;

  const UserServiceSpy = jasmine.createSpyObj('UserService', ['emailId']);

  const expectsGridColumnData: any = `{"bayMappingStoreGrid":[{
    0: "Width",
    1: "width",
    2: 0,
    3: true,
    4: false,
    5: false,
    6: false,
    7: 0,
    8: 30,
    9: false,
    10: "float",
    11: "Width",
    12: "",
    13: "",
    14: "",
    15: "",
    16: 0,
    17: 2792,
    18: 0,
    FilterTemplate: "",
    Template: "dataItem.width*0.083333"
    }]}`;
  const body = [{}];
  const id = 'bayMappingStoreGrid';
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        KendoService,
        { provide: HttpClient },
        { provide: ConfigService, useValue: ConfigServiceSpy },
        { provide: UserService, useValue: UserServiceSpy }
      ]
    });
  });

  beforeEach(() => {
    httpClientSpy = jasmine.createSpyObj('HttpClient', ['post', 'get']);
    kendoService = new KendoService(httpClientSpy as any, ConfigServiceSpy as any, UserServiceSpy as any);
  });

  it('should be created', () => {
    kendoService = TestBed.inject(KendoService);
    expect(kendoService).toBeTruthy();
  });

  it('should save grid configuration into Database', fakeAsync(() => {
    httpClientSpy.post.and.returnValue(asyncData(expectsGridColumnData));
    const gridColumnData = kendoService.updateGridConfig(JSON.stringify(expectsGridColumnData), id).pipe(resp => {
      return resp;
    });
    gridColumnData.subscribe(resp => {
      expect(resp).toEqual(expectsGridColumnData);
    });
    tick();
  }));

  it('should Reset Grid Config', fakeAsync(() => {
    httpClientSpy.post.and.returnValue(asyncData(true));
    const updatedRules = kendoService.resetGridConfig(JSON.stringify(expectsGridColumnData), id).pipe(resp => {
      return resp;
    });

    updatedRules.subscribe(resp => {
      expect(resp).toBeTrue();
    });
    tick();
  }));

  it('should return an error when the server returns a 404', () => {
    const errorResponse = new HttpErrorResponse({
      error: 'testing 404 error',
      status: 404,
      statusText: 'record not found'
    });

    httpClientSpy.post.and.returnValue(asyncError(errorResponse));
    kendoService.updateGridConfig(JSON.stringify(expectsGridColumnData), id).subscribe(
      gridColumns => fail(`${gridColumns}: expected an error, not response`),
      error => expect(error.message).toContain('record not found')
    );
  });
});

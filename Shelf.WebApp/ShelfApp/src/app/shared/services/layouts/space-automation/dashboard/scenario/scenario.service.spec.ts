import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ScenarioService } from './scenario.service';
import { HttpClient } from '@angular/common/http';
import { ConfigService } from 'src/app/shared/services/common/configuration/config.service';
import { asyncData } from 'src/test';

describe('ScenarioService', () => {
  let scenarioService: ScenarioService;
  let httpClientSpy: { post: jasmine.Spy; get: jasmine.Spy };
  let envConfigSpy: jasmine.Spy;
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
  getApiUrlSpy = ConfigServiceSpy.loadConfig.and.returnValue(asyncData(environment));
  applicationUrlSpy = ConfigServiceSpy.environment.and.returnValue(asyncData(environment));
  const expectedAllScenarios: any = {
    Scenario: [
      {
        IdProject: 1355,
        IdScenario: 1375,
        ScenarioName: 'Default scenario 1013B NICI Beverage Sports Drink1',
        ProjectName: '1013B NICI Beverage Sports Drink',
        Task: null,
        WeekStartDate: '2018-06-10T12:00:00Z',
        WeekEndDate: '2019-06-08T12:00:00Z',
        Status: 3,
        AssortStatus: 3,
        LastModified: '2020-01-13T07:15:07Z',
        Location: 'NOR CAL',
        Categories: 'BEVERAGE SPORT DRINK',
        TotalWeeks: 52,
        ProjectType: 'NICI',
        AssignmentType: 2,
        NiciHierarchy: 1,
        LastStatusCode: 2,
        NotesCount: 2
      },
      {
        IdProject: 1321,
        IdScenario: 1324,
        ScenarioName: 'Default scenario AB_TestAdultIncontinence_15112019',
        ProjectName: 'test_nici_j_12_10_19',
        Task: null,
        WeekStartDate: '2018-10-28T12:00:00Z',
        WeekEndDate: '2018-12-29T12:00:00Z',
        Status: 2,
        AssortStatus: 3,
        LastModified: '2020-01-09T10:10:15Z',
        Location: 'NOR CAL',
        Categories: 'DEODORANT',
        TotalWeeks: 9,
        ProjectType: 'Reset',
        AssignmentType: 2,
        NiciHierarchy: 1,
        LastStatusCode: 2,
        NotesCount: 0
      },
      {
        IdProject: 1364,
        IdScenario: 1365,
        ScenarioName: 'Test rename scenario1',
        ProjectName: 'Test_nici_j2_14_10',
        Task: null,
        WeekStartDate: '2018-12-09T12:00:00Z',
        WeekEndDate: '2019-02-23T12:00:00Z',
        Status: 3,
        AssortStatus: 3,
        LastModified: '2019-12-09T04:20:09Z',
        Location: 'NOR CAL',
        Categories: 'DEODORANT',
        TotalWeeks: 11,
        ProjectType: 'NICI',
        AssignmentType: 2,
        NiciHierarchy: 1,
        LastStatusCode: 2,
        NotesCount: 4
      },
      {
        IdProject: 1393,
        IdScenario: 1400,
        ScenarioName: 'Default scenario Allocate Test Project GMS#3',
        ProjectName: 'Allocate Test Project GMS#3',
        Task: null,
        WeekStartDate: '2017-08-27T12:00:00Z',
        WeekEndDate: '2018-08-25T12:00:00Z',
        Status: 2,
        AssortStatus: 3,
        LastModified: '2019-11-24T10:57:51Z',
        Location: 'NOR CAL',
        Categories: 'JUICE / DRINK',
        TotalWeeks: 52,
        ProjectType: 'Reset',
        AssignmentType: 2,
        NiciHierarchy: 1,
        LastStatusCode: 1,
        NotesCount: 0
      },
      {
        IdProject: 1355,
        IdScenario: 1356,
        ScenarioName: 'Default scenario 1013B NICI Beverage Sports Drink',
        ProjectName: '1013B NICI Beverage Sports Drink',
        Task: null,
        WeekStartDate: '2018-06-10T12:00:00Z',
        WeekEndDate: '2019-06-08T12:00:00Z',
        Status: 10,
        AssortStatus: 3,
        LastModified: '2019-10-14T08:59:26Z',
        Location: 'NOR CAL',
        Categories: 'BEVERAGE SPORT DRINK',
        TotalWeeks: 52,
        ProjectType: 'NICI',
        AssignmentType: 2,
        NiciHierarchy: 1,
        LastStatusCode: 2,
        NotesCount: 2
      },
      {
        IdProject: 1017,
        IdScenario: 1036,
        ScenarioName: 'Default scenario 0917A NICI Pancake & Syrup',
        ProjectName: '0917A NICI Pancake & Syrup',
        Task: null,
        WeekStartDate: '2018-06-10T12:00:00Z',
        WeekEndDate: '2019-06-08T12:00:00Z',
        Status: 3,
        AssortStatus: 3,
        LastModified: '2019-09-17T07:24:23Z',
        Location: 'NOR CAL',
        Categories: 'SYRUP / PANCAKE MIX',
        TotalWeeks: 52,
        ProjectType: 'NICI',
        AssignmentType: 2,
        NiciHierarchy: 1,
        LastStatusCode: 2,
        NotesCount: 3
      }
    ],
    Extra: [
      {
        ScenarioId: 1375,
        RState: 0,
        PState: 0,
        DState: 0,
        CState: 0,
        EState: 0,
        NullState: 0,
        Approved: 0,
        Rejected: 0,
        ExcludedStores: 0,
        NumberOfStore: 0,
        IDModelPog: null,
        GeneratedPog: null,
        AllocateBy: 1,
        SSPogBy: 2,
        ApplyRulesBy: 2,
        PriorityRulesBy: 2,
        EnableLayout: 1
      },
      {
        ScenarioId: 1324,
        RState: 0,
        PState: 0,
        DState: 0,
        CState: 0,
        EState: 0,
        NullState: 0,
        Approved: 0,
        Rejected: 0,
        ExcludedStores: 0,
        NumberOfStore: 0,
        IDModelPog: null,
        GeneratedPog: null,
        AllocateBy: 1,
        SSPogBy: 2,
        ApplyRulesBy: 2,
        PriorityRulesBy: 2,
        EnableLayout: 1
      },
      {
        ScenarioId: 1365,
        RState: 0,
        PState: 0,
        DState: 0,
        CState: 0,
        EState: 0,
        NullState: 0,
        Approved: 0,
        Rejected: 0,
        ExcludedStores: 0,
        NumberOfStore: 0,
        IDModelPog: null,
        GeneratedPog: null,
        AllocateBy: 1,
        SSPogBy: 2,
        ApplyRulesBy: 2,
        PriorityRulesBy: 2,
        EnableLayout: 1
      },
      {
        ScenarioId: 1400,
        RState: 0,
        PState: 0,
        DState: 0,
        CState: 0,
        EState: 0,
        NullState: 0,
        Approved: 0,
        Rejected: 0,
        ExcludedStores: 0,
        NumberOfStore: 0,
        IDModelPog: null,
        GeneratedPog: null,
        AllocateBy: 1,
        SSPogBy: 2,
        ApplyRulesBy: 2,
        PriorityRulesBy: 2,
        EnableLayout: 1
      },
      {
        ScenarioId: 1356,
        RState: 0,
        PState: 0,
        DState: 0,
        CState: 0,
        EState: 0,
        NullState: 0,
        Approved: 0,
        Rejected: 0,
        ExcludedStores: 0,
        NumberOfStore: 0,
        IDModelPog: null,
        GeneratedPog: null,
        AllocateBy: 1,
        SSPogBy: 2,
        ApplyRulesBy: 2,
        PriorityRulesBy: 2,
        EnableLayout: 1
      },
      {
        ScenarioId: 1036,
        RState: 0,
        PState: 0,
        DState: 0,
        CState: 0,
        EState: 0,
        NullState: 0,
        Approved: 0,
        Rejected: 0,
        ExcludedStores: 0,
        NumberOfStore: 0,
        IDModelPog: null,
        GeneratedPog: null,
        AllocateBy: 1,
        SSPogBy: 2,
        ApplyRulesBy: 2,
        PriorityRulesBy: 2,
        EnableLayout: 1
      }
    ],
    AzureURLKey: [
      {
        AzureURLKey: '{"IsOnAzure":"True","URL":"https://allocateapidev.azurewebsites.net","SecretID":"7Ly6Sn8dhol23MbzXpOvWlVMemT7wuLhHynIqBMBWMNpnAle1WDhxw==","SignalRConfig": "https://allocaterequesthandlerdev.azurewebsites.net/api?code=ty/dCyQKF4nBfZKBshoEMbsYxF1lwtuh/dKeT/Bb6yNZnmbfwfTABw==&","BlobURl":"https://allocatedata.blob.core.windows.net"}'
      }
    ]
  };
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ScenarioService,
        { provide: HttpClient },
        { provide: ConfigService, useValue: ConfigServiceSpy }
      ]
    });
    scenarioService = TestBed.inject(ScenarioService);
  });
  beforeEach(() => {
    httpClientSpy = jasmine.createSpyObj('HttpClient', ['get', 'post']);
    scenarioService = new ScenarioService(httpClientSpy as any, ConfigServiceSpy as any);
  });
  it('should be created', () => {
    expect(scenarioService).toBeTruthy();
  });
    

  it('should be able to rename scenario', fakeAsync(() => {
    httpClientSpy.post.and.returnValue(asyncData(true));
    const renameScenario = scenarioService.renameScenario('').pipe(rename => {
      return rename;
    });
    renameScenario.subscribe(resp => {
      expect(resp).toBeTrue();
    });
    tick();
  }));

 
});

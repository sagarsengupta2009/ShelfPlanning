import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ScenariosComponent } from './scenarios.component';
import { ScenarioService } from 'src/app/shared/services/layouts/space-automation/dashboard/scenario/scenario.service';
import { SaDashboardService } from 'src/app/shared/services/layouts/space-automation/dashboard/sa-dashboard.service';
import { asyncData } from 'src/test';
import { ValueAtIndexPipe } from 'src/app/shared/pipe/valueAtIndex/value-at-index.pipe';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { OverlayModule } from '@angular/cdk/overlay';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { RouterTestingModule } from '@angular/router/testing';
import { SharedService } from 'src/app/shared/services/common/shared/shared.service';
import { BehaviorSubject } from 'rxjs';
import { SharedModule } from '@progress/kendo-angular-grid';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

export function HttpLoaderFactory(http: HttpClient) {
  return new TranslateHttpLoader(http);
}

describe('ScenariosComponent', () => {
  let component: ScenariosComponent;
  let fixture: ComponentFixture<ScenariosComponent>;

  let GetAllScenariosSpy: jasmine.Spy;
  let GetAllGridColumnsSpy: jasmine.Spy;
  let GetGridColumnsSpy: jasmine.Spy;
  let GetAllColumnsSpy: jasmine.Spy;

  const subjectMock = new BehaviorSubject<string>('');
  const rowChangeSubjectMock = new BehaviorSubject<object>(null);
  const GetAllScenariosResponse: any[] = [];
  const GetAllGridColumnsResponse: any[] = [];
  const GetGridColumnsResponse: any[] = [];
  const GetAllColumnsRespone: any[] = [];
  const isRefreshParam = false;

  beforeEach(waitForAsync(() => {
    const MockScenarioService = jasmine.createSpyObj('ScenarioService', ['GetAllScenarios']);
    const MockSaDashboardService = jasmine.createSpyObj('SaDashboardService', ['GetAllGridColumns', 'GetGridColumns']);
    const MockIndexedDBService = jasmine.createSpyObj('NgxIndexedDBService', ['add', 'update', 'getAll']);
    const MockSharedService = jasmine.createSpyObj('SharedService', ['setScenarioDetails'],
      {
        filterSearch: subjectMock.asObservable(),
        rowChangeEvent: rowChangeSubjectMock.asObservable()
      });
    GetAllScenariosSpy = MockScenarioService.GetAllScenarios.and.returnValue(asyncData(GetAllScenariosResponse));
    GetAllGridColumnsSpy = MockSaDashboardService.GetAllGridColumns.and.returnValue(asyncData(GetAllGridColumnsResponse));
    GetGridColumnsSpy = MockSaDashboardService.GetGridColumns.and.returnValue(asyncData(GetGridColumnsResponse));
    GetAllColumnsSpy = MockIndexedDBService.getAll.and.returnValue(asyncData(GetAllColumnsRespone));

    TestBed.configureTestingModule({
      imports: [
        TranslateModule.forRoot({
          loader: {
            provide: TranslateLoader,
            useFactory: HttpLoaderFactory,
            deps: [HttpClient]
          }
        }),
        HttpClientTestingModule,
        OverlayModule,
        SharedModule,
        RouterTestingModule,
        MatDialogModule,
        MatSnackBarModule
      ],
      providers: [ValueAtIndexPipe, HttpClient, MatSnackBar,
        { provide: ScenarioService, useValue: MockScenarioService },
        { provide: SaDashboardService, useValue: MockSaDashboardService },
        { provide: SharedService, useValue: MockSharedService }
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
      declarations: [ScenariosComponent]
    })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ScenariosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    const value = '';
    fixture.detectChanges();
    subjectMock
      .subscribe((res) => {
        expect(res).toEqual(value);
      });
    subjectMock.next(value);

    rowChangeSubjectMock
      .subscribe((res) => {
        expect(res).toEqual(null);
      });

    expect(component).toBeTruthy();
  });
});

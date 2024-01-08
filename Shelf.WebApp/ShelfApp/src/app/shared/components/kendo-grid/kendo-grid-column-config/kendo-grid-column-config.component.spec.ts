import { DragDropModule } from '@angular/cdk/drag-drop';
import { HttpClient } from '@angular/common/http';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { CUSTOM_ELEMENTS_SCHEMA, NgZone, Pipe, PipeTransform } from '@angular/core';
import { ComponentFixture, fakeAsync, TestBed, tick, waitForAsync } from '@angular/core/testing';
import { MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { OrderByPipe } from 'src/app/shared/pipe/order-by.pipe';
import { ValueAtIndexPipe } from 'src/app/shared/pipe/valueAtIndex/value-at-index.pipe';
import { KendoService } from 'src/app/shared/services';
import { SharedService } from 'src/app/shared/services/common/shared/shared.service';
import { SaDashboardService } from 'src/app/shared/services/layouts/space-automation/dashboard/sa-dashboard.service';
import { KendoGridConfigMockData } from 'src/assets/dummyApis/TestingConstants/KendoGridColumnConfig.const';
import { asyncData } from 'src/test';
import { KendoGridColumnConfigComponent } from './kendo-grid-column-config.component';

@Pipe({ name: 'translate' })
export class TranslatePipe implements PipeTransform {
  transform = (args: string): string => 'hi';
}

export function HttpLoaderFactory(http: HttpClient) {
  return new TranslateHttpLoader(http);
}

describe('KendoGridColumnConfigComponent', () => {
  let component: KendoGridColumnConfigComponent;
  let fixture: ComponentFixture<KendoGridColumnConfigComponent>;
  const isInAngularZoneFn = NgZone.isInAngularZone;
  let isInAngularZone = true;
  let getGridColumnsSpy: jasmine.Spy;
  let GridValueUpdatedSpy: jasmine.Spy;
  let setGridColumnsSpy: jasmine.Spy;
  let updateGridConfigSpy: jasmine.Spy;
  let resetGridConfigSpy: jasmine.Spy;

  const setGridColumnsData: any[] = [];
  const inputGridConfigMock = KendoGridConfigMockData.inputGridConfigMock;

  const MockSaDashboardService = jasmine.createSpyObj('SaDashboardService', ['GetGridColumns', 'setGridColumns']);

  const MockSharedService = jasmine.createSpyObj('SharedService', ['GridValueUpdated']);

  const MockKendoService = jasmine.createSpyObj('KendoService', ['updateGridConfig', 'resetGridConfig']);

  setGridColumnsSpy = MockSaDashboardService.setGridColumns.and.returnValue(
    setGridColumnsData
  );

  updateGridConfigSpy = MockKendoService.updateGridConfig.and.returnValue(asyncData('success'));
  resetGridConfigSpy = MockKendoService.resetGridConfig.and.returnValue(asyncData('success'));
  beforeEach(waitForAsync(() => {
    getGridColumnsSpy = MockSaDashboardService.GetGridColumns.and.returnValue(inputGridConfigMock.gridConfig.columns);
    GridValueUpdatedSpy = MockSharedService.GridValueUpdated.and.returnValue(true);
    TestBed.configureTestingModule({
      imports: [
        MatDialogModule,
        TranslateModule.forRoot({
          loader: {
            provide: TranslateLoader,
            useFactory: HttpLoaderFactory,
            deps: [HttpClient]
          }
        }),
        HttpClientTestingModule,
        MatSnackBarModule,
        DragDropModule,
      ],
      providers: [
        {
          provide: MAT_DIALOG_DATA, useValue: {
            gridConfig: inputGridConfigMock.gridConfig,
            groups: [],
            sort: inputGridConfigMock.sort
          }
        },
        { provide: SaDashboardService, useValue: MockSaDashboardService },
        { provide: SharedService, useValue: MockSharedService },
        { provide: KendoService, useValue: MockKendoService },
        ValueAtIndexPipe,
        HttpClient,
      ],
      declarations: [KendoGridColumnConfigComponent, OrderByPipe],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    })
      .compileComponents();
  }));

  beforeEach(() => {
    isInAngularZone = true;
    NgZone.isInAngularZone = () => isInAngularZone;
    fixture = TestBed.createComponent(KendoGridColumnConfigComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', fakeAsync(() => {
    isInAngularZone = true;
    NgZone.isInAngularZone = () => isInAngularZone;
    fixture.detectChanges();
    // tick();
    expect(component).toBeTruthy();
  }));

  it('should save Column Configuration', fakeAsync(() => {
    component.SaveConfiguration();
    tick(15000);
  }));

  it('should Reset Column Configuration', fakeAsync(() => {
    component.resetColumnConfig();
    tick(15000);
  }));

  it('should serach for records', fakeAsync(() => {
    component.searchColumn = 'depth';
    component.searchAndHighlight();
    tick(15000);
  }));

  it('should lock column', fakeAsync(() => {
    component.lockUnlock(1, KendoGridConfigMockData.lockUnlockMock);
  }));
});

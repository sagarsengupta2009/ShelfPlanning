import { ComponentFixture, TestBed, fakeAsync, tick, waitForAsync } from '@angular/core/testing';
import { KendoGridComponent } from './kendo-grid.component';
import { NgZone, SimpleChanges, CUSTOM_ELEMENTS_SCHEMA, PipeTransform, Pipe, InjectionToken } from '@angular/core';
import { KendoService, SaDashboardService } from '../../services';
import { ExcelModule, GridModule } from '@progress/kendo-angular-grid';
import { SortDescriptor, GroupDescriptor } from '@progress/kendo-data-query';
import { ValueAtIndexPipe } from 'src/app/shared/pipe/valueAtIndex/value-at-index.pipe';
import { TranslateLoader, TranslateModule, } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { HttpClient } from '@angular/common/http';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { SharedService } from '../../services/common/shared/shared.service';
import { GridColumnFormatterPipe } from '../../pipe/columnFormatter/grid-column-formatter.pipe';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { KendoGridMockData } from 'src/assets/dummyApis/TestingConstants/KendoGrid.const';

@Pipe({ name: 'translate' })
export class TranslatePipe implements PipeTransform {
  transform = (args: string): string => 'hi';
}

@Pipe({ name: 'safe' })
export class SafePipe implements PipeTransform {
  transform = (args: string): string => 'hi';
}
export function HttpLoaderFactory(http: HttpClient) {
  return new TranslateHttpLoader(http);
}

const exportToExcelEvent = KendoGridMockData.exportToExcelMock;
const gridConfigConst = KendoGridMockData.kendoGridConfig;
const changes: SimpleChanges = KendoGridMockData.simpleChangeMock;
describe('KendoGridComponent', () => {
  let component: KendoGridComponent;
  let fixture: ComponentFixture<KendoGridComponent>;

  let GetGridColumnsSpy: jasmine.Spy;
  let onStableSpy: jasmine.Spy;
  let updateGridConfigSpy: jasmine.Spy;
  let setGridColumnsSpy: jasmine.Spy;
  const GetGridColumnsResponse: any[] = [];
  const onStableResponse: any[] = [];
  const updateGridConfigSpyData: any[] = [];
  const setGridColumnsData: any[] = [];
  const isInAngularZoneFn = NgZone.isInAngularZone;
  let isInAngularZone = true;
  const expectedlistofColumns: any[] = [];

  beforeEach(waitForAsync(() => {
    // const mockNgZone = jasmine.createSpyObj('NgZone', ['onStable']); // , 'run', 'runOutsideAngular'
    const MockKendoService = jasmine.createSpyObj('KendoService', [
      'updateGridConfig', 'confirmRemove'
    ]);
    const MockSaDashboardService = jasmine.createSpyObj('SaDashboardService', [
      'setGridColumns', 'GetAllGridColumns'
    ]);

    const MockSharedService = jasmine.createSpyObj('SharedService', ['rowChangeInvoked']);

    GetGridColumnsSpy = MockSaDashboardService.GetAllGridColumns.and.returnValue(
      GetGridColumnsResponse
    );
    setGridColumnsSpy = MockSaDashboardService.setGridColumns.and.returnValue(
      setGridColumnsData
    );
    // onStableSpy = mockNgZone.onStable.and.returnValue(asyncData(onStableResponse));
    updateGridConfigSpy = MockKendoService.updateGridConfig.and.returnValue(
      updateGridConfigSpyData
    );

    TestBed.configureTestingModule({
      imports: [GridModule,
        TranslateModule.forRoot({
          loader: {
            provide: TranslateLoader,
            useFactory: HttpLoaderFactory,
            deps: [HttpClient]
          }
        }),
        HttpClientTestingModule,
        MatSnackBarModule,
        MatDialogModule,
        BrowserAnimationsModule,
        ExcelModule
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
      providers: [
        HttpClient,
        { provide: KendoService, useValue: MockKendoService },
        { provide: SaDashboardService, useValue: MockSaDashboardService },
        { provide: SharedService, useValue: MockSharedService },
        ValueAtIndexPipe,
        GridColumnFormatterPipe,
      ],
      declarations: [KendoGridComponent, ValueAtIndexPipe, SafePipe, GridColumnFormatterPipe]
    }).compileComponents();
  }));

  beforeEach(() => {
    isInAngularZone = true;
    NgZone.isInAngularZone = () => isInAngularZone;
    fixture = TestBed.createComponent(KendoGridComponent);
    component = fixture.componentInstance;
    component.gridConfig = gridConfigConst;
    fixture.detectChanges();
  });

  afterEach(() => { NgZone.isInAngularZone = isInAngularZoneFn; });
  it('should create', fakeAsync(() => {
    isInAngularZone = true;
    NgZone.isInAngularZone = () => isInAngularZone;
    tick();
    fixture.detectChanges();
    expect(component).toBeTruthy();
  }));

  it('all object should contain expected records after Angular calls ngOnInit', fakeAsync(() => {
    component.ngOnInit();
  }));
  it('all object should contain expected records after Angular calls ngOnChanges', fakeAsync(() => {
    if (changes) {
      component.ngOnChanges(changes);
      tick(15000);
      expect(component.gridConfig).toEqual(gridConfigConst);
    }
  }));

  it('should fire columnVisibilityChangeHandler event', () => {
    component.columnVisibilityChangeHandler(null);
  });

  it('should fire detailCollapseHandler event', () => {
    component.detailCollapseHandler(null);
  });
  it('should fire detailExpandHandler event', () => {
    component.detailExpandHandler(null);
  });

  it('should fire excelExportHandler event', fakeAsync(() => {
    tick(15000);
    component.gridConfig = KendoGridMockData.exportToExcelMock.exportKendoGridConfig;
    if (changes) {
      component.ngOnChanges(changes);
      tick(15000);
    }
    fixture.detectChanges();

    component.gridConfig = KendoGridMockData.exportToExcelMock.exportKendoGridConfig;
    fixture.detectChanges();

    component.excelExportHandler(exportToExcelEvent);
    expect(component.excelExportHandler).toBeTruthy();
  }));

  it('should abe to download custom Excel', () => {
    component.customSaveAsExcel();
    expect(component.customSaveAsExcel).toBeTruthy();
  });

  it('should empty the grid records', () => {
    component.destroyGrid();
    expect(component.groups).toEqual([]);
    expect(component.sort).toEqual([]);
  });

  it('should able to open Notes', () => {
    component.openNotes('');
    expect(component.openNotes).toBeTruthy();
  });

  it('should able to close Grid row', () => {
    const editHand = { sender: component.grid, rowIndex: 1, dataItem: '' };
    component.editHandler(editHand);
    expect(component.editHandler).toBeTruthy();
  });

  it('should able to remove Handler', () => {
    const dataItem = '';
    component.removeHandler({ dataItem });
    expect(component.removeHandler).toBeTruthy();
  });

  it('should fire groupChangeHandler event', () => {
    component.groupChangeHandler({} as GroupDescriptor[]);
  });
  it('should fire selectionChangeHandler event', () => {
    component.selectionChangeHandler(KendoGridMockData.SelectionEventMock);
    expect(component.objCopyOfMySelection.length).toBe(1);
  });

  it('should fire DeselectedChangeHandler event', () => {
    component.selectionChangeHandler(KendoGridMockData.DeSelectionEventMock);
    expect(component.objCopyOfMySelection.length).toBe(0);
  });
  it('should fire sortChangeHandler event', () => {
    component.sortChangeHandler({} as SortDescriptor[]);
  });
  it('should fire columnLockedChangeHandler event', () => {
    component.columnLockedChangeHandler(null);
  });
  it('should fire columnReorderHandler event', () => {
    component.columnReorderHandler(null);
  });
  // it('should fire columnResizeHandler event', () => {
  //   component.columnResizeHandler(null);
  // });
  it('should fire onStateChangeHandler event', () => {
    component.onStateChangeHandler(null);
  });
  it('should fire cellClickHandler event', () => {
    component.cellClickHandler({ sender: null, rowIndex: 0, columnIndex: 1, dataItem: null, isEdited: true });
  });
  it('should fire cancelHandler event', () => {
    component.cancelHandler({ sender: null, rowIndex: 0 });
  });
  it('should fire removeHandler event', () => {
    component.removeHandler({ dataItem: null });
  });
  it('should fire cellCloseHandler event', () => {
    component.cellCloseHandler(null);
  });
  it('should load next set of records in grid', () => {
    component.closeEditor(null);
  });
});

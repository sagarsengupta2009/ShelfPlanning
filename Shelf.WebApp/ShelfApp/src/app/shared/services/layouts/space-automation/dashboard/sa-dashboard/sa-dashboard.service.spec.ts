import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { SaDashboardService } from './sa-dashboard.service';
import { KendoColumnSetting } from 'src/app/shared/models/kendoGrid';
import { HttpErrorResponse } from '@angular/common/http';
import { asyncError, asyncData } from 'src/test';

describe('SaDashboardService', () => {
  let saDashboardService: SaDashboardService;
  let httpClientSpy: { get: jasmine.Spy };
  let envConfigSpy: jasmine.Spy;
  const expectedAllColumns: any[] = [];
  const expectsColumns: KendoColumnSetting[] = [
    {
      field: 'ProjectName',
      title: 'Project',
      width: 30,
      format: null,
      type: 'string',
      editable: false,
      filterable: { multi: true, search: true },
      hidden: false,
      locked: false,
      sortable: { initialDirection: null },
      templateDummy: ''
    }
  ];
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [SaDashboardService]
    });
  });
  beforeEach(() => {
    httpClientSpy = jasmine.createSpyObj('HttpClient', ['get']);
    saDashboardService = new SaDashboardService(httpClientSpy as any, envConfigSpy as any);
  });
  it('should be created', () => {
    saDashboardService = TestBed.inject(SaDashboardService);
    expect(saDashboardService).toBeTruthy();
  });
  it('should return expected all columns', () => {
    httpClientSpy.get.and.returnValue(asyncData(expectedAllColumns));
    saDashboardService.GetAllGridColumns().subscribe(allColumns => {
      expect(allColumns).toEqual(expectedAllColumns);
    });
  });
  // it('should return grid columns for selected grid', () => {
  //   const columns = saDashboardService.GetGridColumns('scenario-grid');
  //   expect(columns[1]).toEqual(expectsColumns[0]);
  // });
  it('should return set columns details for selected grid', () => {
    saDashboardService.setGridColumns('scenario-grid', expectsColumns);
  });
  it('should return an error when the server returns a 404', () => {
    const errorResponse = new HttpErrorResponse({
      error: 'testing 404 error',
      status: 404,
      statusText: 'record not found'
    });

    httpClientSpy.get.and.returnValue(asyncError(errorResponse));
    saDashboardService.GetAllGridColumns().subscribe(
      allColumns => fail(`${allColumns}: expected an error, not response`),
      error => expect(error.message).toContain('record not found')
    );
  });
});

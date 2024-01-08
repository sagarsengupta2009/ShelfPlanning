import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FixtureWorksheetComponent } from './fixture-worksheet.component';

describe('FixtureWorksheetComponent', () => {
  let component: FixtureWorksheetComponent;
  let fixture: ComponentFixture<FixtureWorksheetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ FixtureWorksheetComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(FixtureWorksheetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

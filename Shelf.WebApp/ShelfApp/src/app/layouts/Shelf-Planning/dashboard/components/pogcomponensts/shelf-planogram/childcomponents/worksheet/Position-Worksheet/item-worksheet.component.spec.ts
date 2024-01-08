import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ItemWorksheetComponent } from './item-worksheet.component';

describe('ItemWorksheetComponent', () => {
  let component: ItemWorksheetComponent;
  let fixture: ComponentFixture<ItemWorksheetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ItemWorksheetComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ItemWorksheetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

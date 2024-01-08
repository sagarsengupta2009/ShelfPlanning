import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ClipboardComponent } from './clipboard.component';

describe('ClipboardComponent', () => {
  let component: ClipboardComponent;
  let fixture: ComponentFixture<ClipboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ClipboardComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ClipboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should', async(() => {
spyOn(component, 'selectAllClipItems');

let selectAll = fixture.debugElement.nativeElement.querySelector('selectAll');
selectAll.click();

fixture.whenStable().then(() => {
  expect(component.selectAllClipItems(selectAll)).toHaveBeenCalled();
});
}));
});


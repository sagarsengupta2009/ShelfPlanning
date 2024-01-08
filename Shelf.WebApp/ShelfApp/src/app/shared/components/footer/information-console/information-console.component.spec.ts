import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { InformationConsoleComponent } from './information-console.component';

describe('InformationConsoleComponent', () => {
  let component: InformationConsoleComponent;
  let fixture: ComponentFixture<InformationConsoleComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [InformationConsoleComponent]
    })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(InformationConsoleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

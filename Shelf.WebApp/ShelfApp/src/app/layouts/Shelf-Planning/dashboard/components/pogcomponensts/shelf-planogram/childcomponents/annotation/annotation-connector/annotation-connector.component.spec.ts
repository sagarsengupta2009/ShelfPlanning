import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AnnotationConnectorComponent } from './annotation-connector.component';

describe('AnnotationConnectorComponent', () => {
  let component: AnnotationConnectorComponent;
  let fixture: ComponentFixture<AnnotationConnectorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AnnotationConnectorComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AnnotationConnectorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

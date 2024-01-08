import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BlockValidationErrorComponent } from './block-validation-error.component';

describe('BlockValidationErrorComponent', () => {
  let component: BlockValidationErrorComponent;
  let fixture: ComponentFixture<BlockValidationErrorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ BlockValidationErrorComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BlockValidationErrorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

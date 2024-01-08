import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BlockFixtureComponent } from './block-fixture.component';

describe('BlockFixtureComponent', () => {
  let component: BlockFixtureComponent;
  let fixture: ComponentFixture<BlockFixtureComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ BlockFixtureComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BlockFixtureComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

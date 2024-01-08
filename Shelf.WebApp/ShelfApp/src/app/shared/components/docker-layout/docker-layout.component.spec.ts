import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DockerLayoutComponent } from './docker-layout.component';

describe('DockerLayoutComponent', () => {
  let component: DockerLayoutComponent;
  let fixture: ComponentFixture<DockerLayoutComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DockerLayoutComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DockerLayoutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

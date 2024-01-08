import { TestBed, waitForAsync } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { AppComponent } from './app.component';
import { TranslateService } from '@ngx-translate/core';
import { SwUpdate, ServiceWorkerModule } from '@angular/service-worker';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { asyncData } from 'src/test';

describe('AppComponent', () => {
  let getBrowserLangSpy: jasmine.Spy;
  let isEnabledSpy: jasmine.Spy;
  let availableSpy: jasmine.Spy;
  const getBrowserLangResponse = 'en';
  const isEnabledSpyResponse = true;
  const availableSpyResposne = true;

  beforeEach(waitForAsync(() => {
    const MockTranslateService = jasmine.createSpyObj('TranslateService', ['getBrowserLang', 'addLangs', 'use']);
    const MockSwUpdate = jasmine.createSpyObj('SwUpdate', ['isEnabled', 'available']);

    getBrowserLangSpy = MockTranslateService.getBrowserLang.and.returnValue(getBrowserLangResponse);
    isEnabledSpy = MockSwUpdate.isEnabled.and.returnValue(isEnabledSpyResponse);
    availableSpy = MockSwUpdate.available.and.returnValue(asyncData(availableSpyResposne));

    TestBed.configureTestingModule({
      providers: [
        { provide: TranslateService, useclass: MockTranslateService },
        { provide: SwUpdate, useclass: MockSwUpdate },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
      imports: [
        RouterTestingModule,
        ServiceWorkerModule.register('ngsw-worker.js', { enabled: false }),
      ],
      declarations: [
        AppComponent
      ],
    }).compileComponents();
  }));

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.debugElement.componentInstance;
    expect(app).toBeTruthy();
  });
});

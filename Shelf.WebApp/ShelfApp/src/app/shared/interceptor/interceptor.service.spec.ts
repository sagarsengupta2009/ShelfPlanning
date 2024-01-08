// import { TestBed, tick, fakeAsync } from '@angular/core/testing';
// import { HttpClientTestingModule } from '@angular/common/http/testing';
// import { InterceptorService } from './interceptor.service';
// import { MsAdalAngular6Service } from 'microsoft-adal-angular6';
// import { OnlineOfflineService } from '../services/common/onlineoffline/online-offline.service';
// import { defer, Observable, Observer } from 'rxjs';

// describe('InterceptorService', () => {
//   let interceptorService: InterceptorService;
//   let acquireTokenSpy: jasmine.Spy;
//   let GetResourceForEndpointSpy: jasmine.Spy;
//   let connectionChangedSpy: jasmine.Spy;
//   let httpClientSpy: { get: jasmine.Spy };

//   const acquireTokenResposne: any[] = [];
//   const GetResourceForEndpointresposne = 'https://localhost:4200';
//   const connectionChangedResposne = {
//     get connectionChanged() {return true; }
//   };

//   const MockAdalService = jasmine.createSpyObj('MsAdalAngular6Service', ['acquireToken', 'GetResourceForEndpoint']);
//   const MockOnlineOfflineService =  jasmine.createSpyObj('OnlineOfflineService', ['connectionChanged']);

//   acquireTokenSpy = MockAdalService.acquireToken.and.returnValue(asyncData(acquireTokenResposne));
//   GetResourceForEndpointSpy = MockAdalService.GetResourceForEndpoint.and.returnValue(GetResourceForEndpointresposne);
//   //connectionChangedSpy = MockOnlineOfflineService.connectionChanged.and.returnValue(connectionChangedResposne.connectionChanged);

//   // const getSpy = jasmine.createSpy().and.returnValue(true);
//   // Object.defineProperty(MockOnlineOfflineService, 'connectionChanged', { get: getSpy });
//   beforeEach(() => TestBed.configureTestingModule({
//     imports: [HttpClientTestingModule],
//     providers: [InterceptorService,
//       { provide: MsAdalAngular6Service, useValue: MockAdalService },
//       { provide: OnlineOfflineService }
//     ]
//   }));

//   beforeEach(() => {
//     httpClientSpy = jasmine.createSpyObj('HttpClient', ['post']);
//     connectionChangedSpy = spyOnProperty(MockOnlineOfflineService, 'connectionChanged', 'get').and.returnValue({connectionChanged : true});
//     interceptorService = new InterceptorService(httpClientSpy as any, MockAdalService , new OnlineOfflineService());
//   });

//   // it('Should spy on Observable', () => {
//   //   const myClassInstance = new OnlineOfflineService();
//   //   // let dropObserver: Observable<any>;
//   //   const dropObservable: Observable<any> = Observable.create( ( ObserverArg: Observer<any>) => {
//   //   return ObserverArg;
//   //   });
//   //   connectionChangedSpy = spyOnProperty(myClassInstance, 'connectionChanged', 'get').and.returnValue(dropObservable);
//   // });

// //   it('can spy on getter', () => {
// //     expect(MockOnlineOfflineService.connectionChanged).toBe(true);
// // });

//   it('should be created', fakeAsync(() => {
//     tick();
//     const service: InterceptorService = TestBed.inject(InterceptorService);
//     //expect(MockOnlineOfflineService.connectionChanged).toBe(connectionChangedResposne);
//     // expect(connectionChangedSpy).toHaveBeenCalled();
//     expect(service).toBeTruthy();
//   }));
// });

// /** Create async observable that emits-once and completes
//  *  after a JS engine turn */
// function asyncData<T>(data: T) {
//   return defer(() => Promise.resolve(data));
// }

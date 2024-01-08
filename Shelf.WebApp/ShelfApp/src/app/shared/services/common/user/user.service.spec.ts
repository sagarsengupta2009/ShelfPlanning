import { TestBed } from '@angular/core/testing';
import { UserService } from './user.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { asyncData, asyncError } from 'src/test';
import { HttpErrorResponse } from '@angular/common/http';
import { UserInfo } from 'src/app/shared/models';
import { ConsoleLogService } from 'src/app/framework.module';

describe('UserService', () => {
  let userService: UserService;
  let httpClientSpy: { get: jasmine.Spy };
  let log: ConsoleLogService;

  const userInformation: UserInfo = {
    emailId: 'someUser@eyc.com',
    name: 'some user'
  };
  // const body = '1';
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [UserService]
    });
  });

  beforeEach(() => {
    httpClientSpy = jasmine.createSpyObj('HttpClient', ['get']);
    log = new ConsoleLogService();
    userService = new UserService(httpClientSpy as any, log);
  });

  it('should be created', () => {
    userService = TestBed.inject(UserService);
    expect(userService).toBeTruthy();
  });

  // Add tests for method

  it('should return current loggened in user information', () => {
    httpClientSpy.get.and.returnValue(asyncData(userInformation));
    userService.getUserInfo().subscribe(user => {
      expect(user).toEqual(userInformation);
    });
  });
  it('should return an error when the server returns a 404', () => {
    const errorResponse = new HttpErrorResponse({
      error: 'testing 404 error',
      status: 404,
      statusText: 'record not found'
    });

    httpClientSpy.get.and.returnValue(asyncError(errorResponse));
    userService.getUserInfo().subscribe(
      user => fail(`${user}: expected an error, not response`),
      error => expect(error.message).toContain('record not found')
    );
  });
});

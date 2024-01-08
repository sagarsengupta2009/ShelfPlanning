import { TestBed } from '@angular/core/testing';

import { OnlineOfflineService } from './online-offline.service';

describe('OnlineOfflineService', () => {
  let onlineOfflineService: OnlineOfflineService;
  const isAvailable = true;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [OnlineOfflineService]
    });
    onlineOfflineService = TestBed.inject(OnlineOfflineService);
  });
  it('should be created', () => {
    expect(onlineOfflineService).toBeTruthy();
  });
  it('should return is Online or Offline', () => {
    const isOnline = onlineOfflineService.isOnline;
    expect(isAvailable).toEqual(isOnline);
  });
  it('should check if connection got changed or not', () => {
    const connChanged = onlineOfflineService.connectionChanged;
  });
  it('should update online status', () => {
    onlineOfflineService.updateOnlineStatus();
  });
});

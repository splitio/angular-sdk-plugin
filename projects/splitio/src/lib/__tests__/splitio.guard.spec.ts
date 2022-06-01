import { getTestBed, TestBed } from '@angular/core/testing';
import { SplitioGuard } from '../splitio.guard';
import { SplitService } from '../splitio.service';
import { localhostConfig } from './testUtils/sdkConfigs';

describe('SplitioGuard', () => {
  let guard: SplitioGuard;
  let service: SplitService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    const injector = getTestBed();
    guard = injector.inject(SplitioGuard);
    service = injector.inject(SplitService);
  });

  it('splitio guard', (done) => {
    expect(guard.canActivate()).toEqual(false);
    service.init(localhostConfig);
    service.sdkReady$.subscribe(() => {
      expect(service.isSDKReady).toEqual(true);
      expect(guard.canActivate()).toEqual(true);
      done();
    });
  });
});

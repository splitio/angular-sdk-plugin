import { getTestBed, TestBed } from '@angular/core/testing';
import { SplitioGuard } from '../splitio.guard';
import { SplitioService } from '../splitio.service';
import { localhostConfig } from './testUtils/sdkConfigs';

describe('SplitioGuard', () => {
  let guard: SplitioGuard;
  let service: SplitioService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    const injector = getTestBed();
    guard = injector.inject(SplitioGuard);
    service = injector.inject(SplitioService);
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

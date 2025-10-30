import {
  getTestBed,
  TestBed,
} from '@angular/core/testing';

import { firstValueFrom } from 'rxjs';

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

  it('splitio guard', async () => {
    expect(guard.canActivate()).toEqual(false);
    service.init(localhostConfig);
    await firstValueFrom(service.sdkReady$);
    expect(service.isSDKReady).toEqual(true);
    expect(guard.canActivate()).toEqual(true);
  });
});

import { TestBed } from '@angular/core/testing';
import { SplitioService } from '../splitio.service';

describe('SplitioService', () => {
  let baseConfig = {
    core: {
      authorizationKey: 'localhost',
      key: 'myKey'
    },
    features: {
      test_split: 'on'
    },
    scheduler: {
      offlineRefreshRate: 0.1
    }
  };

  let service: SplitioService;

  beforeEach(() => {
    TestBed.configureTestingModule({providers: [SplitioService]});
  });

  it('should be created', () => {
    service = TestBed.inject(SplitioService);
    expect(service).toBeTruthy();
  });

  it('SDK Events TIMED OUT', (done) => {
    let config = {
      core: {
        authorizationKey: '<fake-token>',
        key:'myKey'
      },
      urls: {
        sdk: 'https://sdk.baseurl/readyFromCache_5',
        events: 'https://events.baseurl/readyFromCache_5'
      },
      startup: {
        readyTimeout: 0.001
      }
    };
    service = TestBed.inject(SplitioService);
    service.initSdk(config);
    service.SDKReadyTimeOut$.subscribe(() => {
      expect(service.isSdkReady).toBeFalse;
      done();
    });
  });

  it('SDK Events READY / UPDATE', (done) => {
    service = TestBed.inject(SplitioService);
    expect(service.isSdkReady).toBeFalse;
    service.initSdk(baseConfig);
    service.ready().then(() => {
      expect(service.isSdkReady).toBeTrue;
    });
    service.SDKUpdate$.subscribe(() => {
      expect(service.isSdkReady).toBeTrue;
      done();
    });
    service.SDKReady$.subscribe(() => {
      expect(service.isSdkReady).toBeTrue;
      service.getSDKFactory().settings.features = { test_split: 'off' };
    });
  });

});

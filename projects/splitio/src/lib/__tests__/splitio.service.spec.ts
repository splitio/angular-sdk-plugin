import { TestBed } from '@angular/core/testing';

import { SplitioService } from '../splitio.service';

describe('SplitioService', () => {
  const config = {
    core: {
      authorizationKey: 'localhost',
      key: 'emma',
      traficType: 'user'
    },
    features: {
      test_split: 'on'
    }
  }

  let service: SplitioService;

  beforeEach(() => {
    TestBed.configureTestingModule({providers: [SplitioService]});
  });

  it('should be created', () => {
    service = TestBed.inject(SplitioService);
    expect(service).toBeTruthy();
  });

});

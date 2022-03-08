import { TestBed } from '@angular/core/testing';

import { SplitioService } from './splitio.service';

describe('SplitioService', () => {
  let service: SplitioService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SplitioService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

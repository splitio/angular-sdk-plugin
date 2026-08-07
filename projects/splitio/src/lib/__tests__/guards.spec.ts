import { TestBed } from '@angular/core/testing';

import {
  BehaviorSubject,
  firstValueFrom,
  isObservable,
} from 'rxjs';

import {
  createMultiTreatmentGuard,
  createTreatmentGuard,
  splitIoReadyGuard,
} from '../guards';
import {
  provideSplitIo,
  SplitIoService,
  withConfig,
} from '../providers';

describe('Functional Guards', () => {
  let mockSplitService: Partial<SplitIoService>;
  let isReadySubject: BehaviorSubject<boolean>;

  beforeEach(() => {
    isReadySubject = new BehaviorSubject<boolean>(true);

    mockSplitService = {
      isReady$: isReadySubject.asObservable(),
      getTreatment: jest.fn(),
      getTreatments: jest.fn(),
      isReady: true
    };

    TestBed.configureTestingModule({
      providers: [
        provideSplitIo(
          withConfig({
            core: {
              authorizationKey: 'localhost',
              key: 'test-user'
            }
          })
        ),
        { provide: SplitIoService, useValue: mockSplitService }
      ]
    });
  });

  describe('splitIoReadyGuard', () => {
    test('should allow navigation when SDK is ready', async () => {
      isReadySubject.next(true);

      const result = TestBed.runInInjectionContext(() => {
        return splitIoReadyGuard({} as any, {} as any);
      });

      if (isObservable(result)) {
        const canActivate = await firstValueFrom(result);
        expect(canActivate).toBe(true);
      } else {
        expect(result).toBe(true);
      }
    });

    test('should block navigation when SDK is not ready', async () => {
      isReadySubject.next(false);

      const result = TestBed.runInInjectionContext(() => {
        return splitIoReadyGuard({} as any, {} as any);
      });

      if (isObservable(result)) {
        const canActivate = await firstValueFrom(result);
        expect(canActivate).toBe(false);
      } else {
        expect(result).toBe(false);
      }
    });

    test('should log warning when SDK is not ready', async () => {
      const consoleSpy = jest.spyOn(console, 'warn');
      isReadySubject.next(false);

      const result = TestBed.runInInjectionContext(() => {
        return splitIoReadyGuard({} as any, {} as any);
      });

      if (isObservable(result)) {
        await firstValueFrom(result);
        expect(consoleSpy).toHaveBeenCalledWith('[Split.io Guard] SDK not ready, blocking navigation');
      } else {
        expect(consoleSpy).toHaveBeenCalledWith('[Split.io Guard] SDK not ready, blocking navigation');
      }
      consoleSpy.mockRestore();
    });
  });

  describe('createTreatmentGuard', () => {
    test('should allow navigation when treatment matches', async () => {
      (mockSplitService.getTreatment as jest.Mock).mockReturnValue('on');

      const guard = createTreatmentGuard('test-feature', 'on');
      const result = TestBed.runInInjectionContext(() => {
        return guard({} as any, {} as any);
      });

      if (isObservable(result)) {
        const canActivate = await firstValueFrom(result);
        expect(canActivate).toBe(true);
        expect(mockSplitService.getTreatment).toHaveBeenCalled();
      } else {
        expect(result).toBe(true);
      }
    });

    test('should block navigation when treatment does not match', async () => {
      (mockSplitService.getTreatment as jest.Mock).mockReturnValue('off');

      const guard = createTreatmentGuard('test-feature', 'on');
      const result = TestBed.runInInjectionContext(() => {
        return guard({} as any, {} as any);
      });

      if (isObservable(result)) {
        const canActivate = await firstValueFrom(result);
        expect(canActivate).toBe(false);
      } else {
        expect(result).toBe(false);
      }
    });

    test('should log message when treatment does not match', async () => {
      const consoleSpy = jest.spyOn(console, 'log');
      (mockSplitService.getTreatment as jest.Mock).mockReturnValue('off');

      const guard = createTreatmentGuard('test-feature', 'on');
      const result = TestBed.runInInjectionContext(() => {
        return guard({} as any, {} as any);
      });

      if (isObservable(result)) {
        await firstValueFrom(result);
        expect(consoleSpy).toHaveBeenCalledWith(
          "[Split.io Guard] Treatment 'off' does not match expected 'on' for test-feature"
        );
      } else {
        expect(consoleSpy).toHaveBeenCalledWith(
          "[Split.io Guard] Treatment 'off' does not match expected 'on' for test-feature"
        );
      }
      consoleSpy.mockRestore();
    });

    test('should log warning when SDK is not ready', async () => {
      const consoleSpy = jest.spyOn(console, 'warn');
      isReadySubject.next(false);

      const guard = createTreatmentGuard('test-feature', 'on');
      const result = TestBed.runInInjectionContext(() => {
        return guard({} as any, {} as any);
      });

      if (isObservable(result)) {
        await firstValueFrom(result);
        expect(consoleSpy).toHaveBeenCalledWith(
          '[Split.io Guard] SDK not ready, cannot evaluate treatment for test-feature'
        );
      } else {
        expect(consoleSpy).toHaveBeenCalledWith(
          '[Split.io Guard] SDK not ready, cannot evaluate treatment for test-feature'
        );
      }
      consoleSpy.mockRestore();
    });

    test('should use attributes function when provided', async () => {
      isReadySubject.next(true);
      (mockSplitService.getTreatment as jest.Mock).mockReturnValue('on');

      const attributesFn = jest.fn(() => ({ age: 25 }));
      const guard = createTreatmentGuard('test-feature', 'on', attributesFn);

      const result = TestBed.runInInjectionContext(() => {
        return guard({} as any, {} as any);
      });

      if (isObservable(result)) {
        await firstValueFrom(result);
        expect(attributesFn).toHaveBeenCalled();
        expect(mockSplitService.getTreatment).toHaveBeenCalledWith('test-feature', { age: 25 });
      } else {
        expect(attributesFn).toHaveBeenCalled();
        expect(mockSplitService.getTreatment).toHaveBeenCalledWith('test-feature', { age: 25 });
      }
    });
  });

  describe('createMultiTreatmentGuard', () => {
    test('should allow navigation when all treatments match', async () => {
      // Mock getTreatment to return different values based on feature flag name
      (mockSplitService.getTreatment as jest.Mock).mockImplementation((featureName: string) => {
        if (featureName === 'feature-a') return 'on';
        if (featureName === 'feature-b') return 'enabled';
        return 'control';
      });

      const guard = createMultiTreatmentGuard([
        { featureFlagName: 'feature-a', expectedTreatment: 'on' },
        { featureFlagName: 'feature-b', expectedTreatment: 'enabled' }
      ]);

      const result = TestBed.runInInjectionContext(() => {
        return guard({} as any, {} as any);
      });

      if (isObservable(result)) {
        const canActivate = await firstValueFrom(result);
        expect(canActivate).toBe(true);
      } else {
        expect(result).toBe(true);
      }
    });

    test('should block navigation when any treatment does not match', async () => {
      // Mock getTreatment to return different values based on feature flag name
      (mockSplitService.getTreatment as jest.Mock).mockImplementation((featureName: string) => {
        if (featureName === 'feature-a') return 'on';
        if (featureName === 'feature-b') return 'off'; // This doesn't match 'enabled'
        return 'control';
      });

      const guard = createMultiTreatmentGuard([
        { featureFlagName: 'feature-a', expectedTreatment: 'on' },
        { featureFlagName: 'feature-b', expectedTreatment: 'enabled' }
      ]);

      const result = TestBed.runInInjectionContext(() => {
        return guard({} as any, {} as any);
      });

      if (isObservable(result)) {
        const canActivate = await firstValueFrom(result);
        expect(canActivate).toBe(false);
      } else {
        expect(result).toBe(false);
      }
    });

    test('should log message when any treatment does not match', async () => {
      const consoleSpy = jest.spyOn(console, 'log');
      (mockSplitService.getTreatment as jest.Mock).mockImplementation((featureName: string) => {
        if (featureName === 'feature-a') return 'on';
        if (featureName === 'feature-b') return 'off';
        return 'control';
      });

      const guard = createMultiTreatmentGuard([
        { featureFlagName: 'feature-a', expectedTreatment: 'on' },
        { featureFlagName: 'feature-b', expectedTreatment: 'enabled' }
      ]);

      const result = TestBed.runInInjectionContext(() => {
        return guard({} as any, {} as any);
      });

      if (isObservable(result)) {
        await firstValueFrom(result);
        expect(consoleSpy).toHaveBeenCalledWith(
          "[Split.io Guard] Treatment 'off' does not match expected 'enabled' for feature-b"
        );
      } else {
        expect(consoleSpy).toHaveBeenCalledWith(
          "[Split.io Guard] Treatment 'off' does not match expected 'enabled' for feature-b"
        );
      }
      consoleSpy.mockRestore();
    });

    test('should log warning when SDK is not ready', async () => {
      const consoleSpy = jest.spyOn(console, 'warn');
      isReadySubject.next(false);

      const guard = createMultiTreatmentGuard([
        { featureFlagName: 'feature-a', expectedTreatment: 'on' }
      ]);

      const result = TestBed.runInInjectionContext(() => {
        return guard({} as any, {} as any);
      });

      if (isObservable(result)) {
        await firstValueFrom(result);
        expect(consoleSpy).toHaveBeenCalledWith(
          '[Split.io Guard] SDK not ready, cannot evaluate treatments'
        );
      } else {
        expect(consoleSpy).toHaveBeenCalledWith(
          '[Split.io Guard] SDK not ready, cannot evaluate treatments'
        );
      }
      consoleSpy.mockRestore();
    });

    test('should use attributes function when provided', async () => {
      isReadySubject.next(true);
      (mockSplitService.getTreatment as jest.Mock).mockReturnValue('on');

      const attributesFn = jest.fn(() => ({ role: 'admin' }));
      const guard = createMultiTreatmentGuard([
        { featureFlagName: 'feature-a', expectedTreatment: 'on', attributes: attributesFn }
      ]);

      const result = TestBed.runInInjectionContext(() => {
        return guard({} as any, {} as any);
      });

      if (isObservable(result)) {
        await firstValueFrom(result);
        expect(attributesFn).toHaveBeenCalled();
        expect(mockSplitService.getTreatment).toHaveBeenCalledWith('feature-a', { role: 'admin' });
      } else {
        expect(attributesFn).toHaveBeenCalled();
        expect(mockSplitService.getTreatment).toHaveBeenCalledWith('feature-a', { role: 'admin' });
      }
    });
  });
});

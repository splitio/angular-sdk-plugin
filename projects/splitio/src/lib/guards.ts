/**
 * Angular guards for Split.io SDK
 */
import { inject } from '@angular/core';
// Legacy guard for backward compatibility (deprecated)
import { Injectable } from '@angular/core';
import {
  CanActivate,
  CanActivateChild,
  CanActivateFn,
  CanLoad,
  CanMatchFn,
} from '@angular/router';

import {
  map,
  take,
} from 'rxjs/operators';

import { Deprecated } from './deprecation';
import { SplitIoService } from './providers';
import { SplitService } from './splitio.service';

/**
 * Functional guard that waits for Split.io SDK to be ready
 *
 * Can be used with canActivate, canActivateChild, or any other guard type.
 *
 * @example
 * ```typescript
 * const routes: Routes = [
 *   {
 *     path: 'feature',
 *     component: FeatureComponent,
 *     canActivate: [splitIoReadyGuard]
 *   },
 *   {
 *     path: 'parent',
 *     component: ParentComponent,
 *     canActivateChild: [splitIoReadyGuard],
 *     children: [
 *       { path: 'child', component: ChildComponent }
 *     ]
 *   }
 * ];
 * ```
 */
export const splitIoReadyGuard: CanActivateFn = () => {
  const splitService = inject(SplitIoService);

  return splitService.isReady$.pipe(
    take(1),
    map(ready => {
      if (!ready) {
        console.warn('[Split.io Guard] SDK not ready, blocking navigation');
      }
      return ready;
    })
  );
};

/**
 * Functional guard for route matching
 *
 * @example
 * ```typescript
 * const routes: Routes = [
 *   {
 *     path: 'feature',
 *     component: FeatureComponent,
 *     canMatch: [splitIoReadyMatchGuard]
 *   }
 * ];
 * ```
 */
export const splitIoReadyMatchGuard: CanMatchFn = () => {
  const splitService = inject(SplitIoService);

  return splitService.isReady$.pipe(
    take(1),
    map(ready => {
      if (!ready) {
        console.warn('[Split.io Guard] SDK not ready, blocking route match');
      }
      return ready;
    })
  );
};

/**
 * Create a custom treatment-based guard
 *
 * @param featureFlagName - The name of the feature flag to check
 * @param expectedTreatment - The expected treatment value (default: 'on')
 * @param attributes - Optional function that returns attributes for treatment evaluation
 *
 * @example
 * ```typescript
 * const featureGuard = createTreatmentGuard('new-feature', 'on');
 *
 * const routes: Routes = [
 *   {
 *     path: 'new-feature',
 *     component: NewFeatureComponent,
 *     canActivate: [featureGuard]
 *   }
 * ];
 * ```
 */
export function createTreatmentGuard(
  featureFlagName: string,
  expectedTreatment: SplitIO.Treatment = 'on',
  attributes?: () => SplitIO.Attributes
): CanActivateFn {
  return () => {
    const splitService = inject(SplitIoService);

    return splitService.isReady$.pipe(
      take(1),
      map(ready => {
        if (!ready) {
          console.warn(`[Split.io Guard] SDK not ready, cannot evaluate treatment for ${featureFlagName}`);
          return false;
        }

        const attrs = attributes ? attributes() : undefined;
        const treatment = splitService.getTreatment(featureFlagName, attrs);
        const allowed = treatment === expectedTreatment;

        if (!allowed) {
          console.log(`[Split.io Guard] Treatment '${treatment}' does not match expected '${expectedTreatment}' for ${featureFlagName}`);
        }

        return allowed;
      })
    );
  };
}

/**
 * Create a guard that checks multiple treatments (AND logic)
 *
 * @param checks - Array of treatment checks
 *
 * @example
 * ```typescript
 * const multiGuard = createMultiTreatmentGuard([
 *   { featureFlagName: 'feature-a', expectedTreatment: 'on' },
 *   { featureFlagName: 'feature-b', expectedTreatment: 'enabled' }
 * ]);
 *
 * const routes: Routes = [
 *   {
 *     path: 'advanced-feature',
 *     component: AdvancedFeatureComponent,
 *     canActivate: [multiGuard]
 *   }
 * ];
 * ```
 */
export function createMultiTreatmentGuard(
  checks: Array<{
    featureFlagName: string;
    expectedTreatment: SplitIO.Treatment;
    attributes?: () => SplitIO.Attributes;
  }>
): CanActivateFn {
  return () => {
    const splitService = inject(SplitIoService);

    return splitService.isReady$.pipe(
      take(1),
      map(ready => {
        if (!ready) {
          console.warn('[Split.io Guard] SDK not ready, cannot evaluate treatments');
          return false;
        }

        for (const check of checks) {
          const attrs = check.attributes ? check.attributes() : undefined;
          const treatment = splitService.getTreatment(check.featureFlagName, attrs);

          if (treatment !== check.expectedTreatment) {
            console.log(
              `[Split.io Guard] Treatment '${treatment}' does not match expected '${check.expectedTreatment}' for ${check.featureFlagName}`
            );
            return false;
          }
        }

        return true;
      })
    );
  };
}

/**
 * @deprecated Use splitIoReadyGuard functional guard instead. This class-based guard will be removed in v5.0.0.
 *
 * Migration:
 * ```typescript
 * // Before
 * import { SplitioGuard } from '@splitsoftware/splitio-angular';
 * canActivate: [SplitioGuard]
 * canActivateChild: [SplitioGuard]
 *
 * // After
 * import { splitIoReadyGuard } from '@splitsoftware/splitio-angular';
 * canActivate: [splitIoReadyGuard]
 * canActivateChild: [splitIoReadyGuard]
 * ```
 */
@Injectable({
  providedIn: 'root'
})
export class SplitioGuard implements CanActivate, CanLoad, CanActivateChild {

  constructor(private splitService: SplitService) {}

  @Deprecated('splitIoReadyGuard')
  canActivate(): boolean {
    return this.splitService.isSDKReady;
  }

  @Deprecated('splitIoReadyGuard')
  canLoad(): boolean {
    return this.splitService.isSDKReady;
  }

  @Deprecated('splitIoReadyGuard')
  canActivateChild(): boolean {
    return this.splitService.isSDKReady;
  }
}

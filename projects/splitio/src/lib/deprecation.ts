/**
 * Deprecation utilities for Split.io Angular SDK migration
 */

/**
 * @deprecated Use provideSplitIo() instead. This service-based approach will be removed in v5.0.0.
 *
 * Migration guide:
 *
 * Before (deprecated):
 * ```typescript
 * // app.module.ts
 * import { SplitioModule } from '@splitsoftware/splitio-angular';
 *
 * @NgModule({
 *   imports: [SplitioModule],
 *   // ...
 * })
 * export class AppModule {}
 *
 * // component
 * constructor(private splitService: SplitService) {}
 *
 * ngOnInit() {
 *   this.splitService.init({
 *     core: {
 *       authorizationKey: 'YOUR_SDK_KEY',
 *       key: 'user-id'
 *     }
 *   }).subscribe(() => {
 *     const treatment = this.splitService.getTreatment('feature-flag');
 *   });
 * }
 * ```
 *
 * After:
 * ```typescript
 * // main.ts
 * import { provideSplitIo, withConfig } from '@splitsoftware/splitio-angular';
 *
 * bootstrapApplication(AppComponent, {
 *   providers: [
 *     provideSplitIo(
 *       withConfig({
 *         core: {
 *           authorizationKey: 'YOUR_SDK_KEY',
 *           key: 'user-id'
 *         }
 *       })
 *     )
 *   ]
 * });
 *
 * // component
 * constructor(private splitService: SplitIoService) {}
 *
 * ngOnInit() {
 *   // SDK auto-initializes, no need to call init()
 *   this.splitService.isReady$.subscribe(ready => {
 *     if (ready) {
 *       const treatment = this.splitService.getTreatment('feature-flag');
 *     }
 *   });
 * }
 * ```
 */
export function deprecationWarning(methodName: string, alternative: string): void {
  console.warn(
    `[Split.io Deprecation Warning] ${methodName} is deprecated and will be removed in v5.0.0. ` +
    `Use ${alternative} instead. See migration guide: https://github.com/splitio/angular-sdk-plugin#migration-guide`
  );
}

/**
 * Decorator to mark methods as deprecated
 */
export function Deprecated(alternative: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = function (...args: any[]) {
      deprecationWarning(`${target.constructor.name}.${propertyKey}()`, alternative);
      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}

/**
 * Mark a class as deprecated
 */
export function DeprecatedClass(alternative: string) {
  return function <T extends new (...args: any[]) => object>(constructor: T) {
    return class extends constructor {
      constructor(...args: any[]) {
        deprecationWarning(constructor.name, alternative);
        super(...args);
      }
    };
  };
}

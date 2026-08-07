# Migration Guide: Split.io Angular SDK v4.0.0+ to Provider Pattern

This guide will help you migrate from the legacy service-based pattern to the provider function pattern introduced in v4.1.0.

## What's New

- **Provider Functions**: Use `provideSplitIo()` instead of manual service initialization
- **Auto-initialization**: SDK initializes automatically on app bootstrap
- **Functional Guards**: Use guard functions instead of class-based guards
- **Better TypeScript Support**: Improved types and stricter typing
- **Angular 18+ Features**: Full support for standalone applications and `bootstrapApplication`
- **Feature Functions**: Configure SDK with `withConfig()`, `withFeatureOptions()`, etc.
- **Signal Support**: Reactive state management with Angular signals alongside Observables

## Migration Steps

### 1. Update Your App Bootstrap (Standalone Application)

**Before (Legacy NgModule)**:
```typescript
// main.ts
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { AppModule } from './app/app.module';

platformBrowserDynamic().bootstrapModule(AppModule);

// app.module.ts
import { NgModule } from '@angular/core';
import { SplitioModule } from '@splitsoftware/splitio-angular';

@NgModule({
  imports: [
    SplitioModule
  ],
  // ...
})
export class AppModule {}
```

**After (Standalone with Provider Functions)**:
```typescript
// main.ts
import { bootstrapApplication } from '@angular/platform-browser';
import { provideSplitIo, withConfig } from '@splitsoftware/splitio-angular';
import { AppComponent } from './app/app.component';

bootstrapApplication(AppComponent, {
  providers: [
    provideSplitIo(
      withConfig({
        core: {
          authorizationKey: 'YOUR_SDK_KEY',
          key: 'user-id'
        },
        autoInit: true,
        debug: false
      })
    )
  ]
});
```

### 2. Update Your Components

**Before (Manual Initialization)**:
```typescript
import { Component, OnInit } from '@angular/core';
import { SplitService } from '@splitsoftware/splitio-angular';

@Component({
  selector: 'app-feature',
  template: `<div *ngIf="isReady">Feature content</div>`
})
export class FeatureComponent implements OnInit {
  isReady = false;

  constructor(private splitService: SplitService) {}

  ngOnInit() {
    // Manual initialization required
    this.splitService.init({
      core: {
        authorizationKey: 'YOUR_SDK_KEY',
        key: 'user-id'
      }
    }).subscribe(() => {
      this.isReady = true;
      const treatment = this.splitService.getTreatment('my-feature');
      
      if (treatment === 'on') {
        // Feature is enabled
      }
    });
  }
}
```

**After (Auto-initialization)**:
```typescript
import { Component, OnInit } from '@angular/core';
import { SplitIoService } from '@splitsoftware/splitio-angular';

@Component({
  selector: 'app-feature',
  template: `
    <div *ngIf="splitService.isReady$ | async">
      Feature content
    </div>
  `
})
export class FeatureComponent implements OnInit {
  constructor(public splitService: SplitIoService) {}

  ngOnInit() {
    // No initialization needed - SDK auto-initializes!
    this.splitService.isReady$.subscribe(ready => {
      if (ready) {
        const treatment = this.splitService.getTreatment('my-feature');
        
        if (treatment === 'on') {
          // Feature is enabled
        }
      }
    });
  }
}
```

### 3. Using Signals for Reactive State (Angular 16+)

The provider pattern now supports signals for reactive state management:

```typescript
import { Component, computed, effect, inject } from '@angular/core';
import { SplitIoService } from '@splitsoftware/splitio-angular';

@Component({
  selector: 'app-feature',
  standalone: true,
  template: `
    @if (isReady()) {
      <div>Feature content is ready</div>
      @if (canShowPremium()) {
        <p>Premium content</p>
      }
    }
    @if (isTimedOut()) {
      <div>Loading timed out</div>
    }
  `
})
export class FeatureComponent {
  private splitService = inject(SplitIoService);
  
  // Access signals directly
  readonly isReady = this.splitService.isReadySignal;
  readonly isTimedOut = this.splitService.isTimedOutSignal;
  
  // Combine signals with computed
  readonly canShowPremium = computed(() => {
    return this.isReady() && !this.isTimedOut();
  });
  
  // Use effects for side effects
  constructor() {
    effect(() => {
      if (this.isReady()) {
        const treatment = this.splitService.getTreatment('premium-feature');
        if (treatment === 'on') {
          console.log('Premium feature enabled');
        }
      }
    });
  }
}
```

Signals provide better performance and simpler syntax compared to Observables, while both APIs remain available for flexibility.

### 4. Update Route Guards

**Before (Class-based Guards)**:
```typescript
import { Injectable } from '@angular/core';
import { CanActivate } from '@angular/router';
import { SplitioGuard } from '@splitsoftware/splitio-angular';

const routes: Routes = [
  {
    path: 'feature',
    component: FeatureComponent,
    canActivate: [SplitioGuard]
  }
];
```

**After (Functional Guards)**:
```typescript
import { 
  splitIoReadyGuard, 
  createTreatmentGuard 
} from '@splitsoftware/splitio-angular';

const routes: Routes = [
  {
    path: 'feature',
    component: FeatureComponent,
    canActivate: [splitIoReadyGuard]
  },
  {
    path: 'advanced-feature',
    component: AdvancedFeatureComponent,
    canActivate: [createTreatmentGuard('advanced-feature', 'on')]
  }
];
```

### 5. Advanced Configuration

**Multiple Feature Flags**:
```typescript
import { 
  provideSplitIo, 
  withConfig, 
  withFeatureOptions,
  createMultiTreatmentGuard 
} from '@splitsoftware/splitio-angular';

// In main.ts
bootstrapApplication(AppComponent, {
  providers: [
    provideSplitIo(
      withConfig({
        core: {
          authorizationKey: 'YOUR_SDK_KEY',
          key: 'user-id'
        },
        debug: true,
        autoInit: true,
        startup: {
          readyTimeout: 10000
        }
      }),
      withFeatureOptions({
        enableImpressions: true,
        enableEvents: true
      })
    )
  ]
});

// Complex guard with multiple feature flags
const advancedGuard = createMultiTreatmentGuard([
  { featureFlagName: 'feature-a', expectedTreatment: 'on' },
  { featureFlagName: 'feature-b', expectedTreatment: 'enabled' }
]);

const routes: Routes = [
  {
    path: 'complex-feature',
    component: ComplexFeatureComponent,
    canActivate: [advancedGuard]
  }
];
```

### 6. Error Handling

**Custom Error Handler**:
```typescript
provideSplitIo(
  withConfig({
    core: {
      authorizationKey: 'YOUR_SDK_KEY',
      key: 'user-id'
    },
    debug: true,
    errorHandler: (error: Error) => {
      console.error('Split.io Error:', error);
      // Send to your error tracking service
      errorTracker.captureException(error);
    }
  })
)
```

### 7. Testing

**Before**:
```typescript
import { TestBed } from '@angular/core/testing';
import { SplitService } from '@splitsoftware/splitio-angular';

describe('FeatureComponent', () => {
  let splitService: SplitService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [FeatureComponent],
      providers: [SplitService]
    });
    
    splitService = TestBed.inject(SplitService);
    splitService.init(mockConfig).subscribe();
  });
});
```

**After**:
```typescript
import { TestBed } from '@angular/core/testing';
import { 
  SplitIoService, 
  provideSplitIo, 
  withConfig 
} from '@splitsoftware/splitio-angular';

describe('FeatureComponent', () => {
  let splitService: SplitIoService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [FeatureComponent],
      providers: [
        provideSplitIo(
          withConfig({
            core: {
              authorizationKey: 'localhost',
              key: 'test-user'
            }
          })
        )
      ]
    });
    
    splitService = TestBed.inject(SplitIoService);
    // No need to call init() - it's automatic!
  });
});
```

## API Reference

### Core Functions

- `provideSplitIo(...features)` - Main provider function
- `withConfig(config)` - Configure SDK settings
- `withFeatureOptions(options)` - Configure feature options

### Guards

- `splitIoReadyGuard` - Wait for SDK to be ready
- `splitIoReadyMatchGuard` - Route matching guard
- `createTreatmentGuard(flag, treatment)` - Custom treatment guard
- `createMultiTreatmentGuard(checks)` - Multiple treatment guard

### Service

- `SplitIoService` - Service with auto-initialization
- `isReady$` - Observable for SDK ready state
- `isReadyFromCache$` - Observable for cache ready state
- `isTimedOut$` - Observable for timeout state
- `hasUpdate$` - Observable for updates
- `isReadySignal` - Signal for SDK ready state
- `isReadyFromCacheSignal` - Signal for cache ready state
- `isTimedOutSignal` - Signal for timeout state
- `hasUpdateSignal` - Signal for updates

## Backward Compatibility

The legacy API is still supported but marked as deprecated:

- `SplitService` - Use `SplitIoService` instead
- `SplitioGuard` - Use functional guards instead
- `SplitioModule` - Use `provideSplitIo()` instead

Deprecation warnings will appear in the console to help with migration.

## Breaking Changes in v5.0.0

The following will be removed in the next major version:

- `SplitService` class
- `SplitioGuard` class  
- `SplitioModule` NgModule
- Manual `init()` method calls

Make sure to migrate to the new provider pattern before upgrading to v5.0.0.

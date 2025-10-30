# Split Angular SDK

[![npm version](https://badge.fury.io/js/%40splitsoftware%2Fsplitio-angular.svg)](https://badge.fury.io/js/%40splitsoftware%2Fsplitio-angular) [![Build Status](https://github.com/splitio/angular-sdk-plugin/actions/workflows/ci.yml/badge.svg)](https://github.com/splitio/angular-sdk-plugin/actions/workflows/ci.yml)

This repository contains utilities for the Angular framework that integrate with Split JS SDK and offer a seamless experience with modern Angular applications.

## Overview

These utilities are designed to work with Split, the platform for controlled rollouts, which serves features to your users via feature flags to manage your complete customer experience.

[![Twitter Follow](https://img.shields.io/twitter/follow/splitsoftware.svg?style=social&label=Follow&maxAge=1529000)](https://twitter.com/intent/follow?screen_name=splitsoftware)

## Compatibility

This SDK is compatible with Angular 18.0.0 and above.

## Quick Start (Provider Pattern - v4.1.0+)

The recommended way to use Split.io with Angular uses provider functions for better integration:

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
          key: 'CUSTOMER_ID'
        },
        autoInit: true
      })
    )
  ]
});
```

```typescript
// app.component.ts
import { Component, OnInit } from '@angular/core';
import { SplitIoService } from '@splitsoftware/splitio-angular';

@Component({
  selector: 'app-root',
  template: `
    <div *ngIf="splitService.isReady$ | async">
      <h1>Welcome to Split.io Angular!</h1>
      <p *ngIf="isFeatureEnabled">Feature is enabled!</p>
    </div>
  `
})
export class AppComponent implements OnInit {
  isFeatureEnabled = false;

  constructor(public splitService: SplitIoService) {}

  ngOnInit() {
    this.splitService.isReady$.subscribe(ready => {
      if (ready) {
        const treatment = this.splitService.getTreatment('FEATURE_FLAG_NAME');
        this.isFeatureEnabled = treatment === 'on';
      }
    });
  }
}
```

## Legacy Usage (Still Supported)

```javascript
// Import the Service
import { SplitService } from '@splitsoftware/splitio-angular';

export class AppComponent implements OnInit {

  constructor(
    // inject SplitService dependency
    private splitio: SplitService
  ) {}

  ngOnInit(): void {

    // Subscribe to init to make sure the SDK is properly loaded before asking for a treatment
    this.splitio.init({
      core: {
        authorizationKey: 'YOUR_SDK_KEY',
        key: 'CUSTOMER_ID'
      }
    }).subscribe(() => {
      var treatment = this.splitio.getTreatment('FEATURE_FLAG_NAME');
      if (treatment == 'on') {
        // insert code here for on treatment
      } else if (treatment == 'off') {
        // insert code here for off treatment
      } else {
        // insert your control treatment code here
      }
    });
  }
}
```

## Features

### Provider Pattern (v4.1.0+)
- **Auto-initialization**: SDK initializes automatically on app bootstrap
- **Provider Functions**: Use `provideSplitIo()` with Angular patterns
- **Feature Functions**: Configure with `withConfig()`, `withFeatureOptions()`
- **Functional Guards**: Guard functions for route protection
- **TypeScript First**: Enhanced type safety and better IntelliSense

### Route Guards
- `splitIoReadyGuard` - Ensure SDK is ready before route activation
- `createTreatmentGuard(flag, treatment)` - Route protection based on feature flags
- `createMultiTreatmentGuard(checks)` - Complex multi-flag route protection

### Reactive State Management

**Observables**:
- `isReady$` - SDK ready state
- `isReadyFromCache$` - Cache ready state  
- `isTimedOut$` - Timeout state
- `hasUpdate$` - Update notifications

**Signals** (Angular 16+):
- `isReadySignal` - SDK ready state signal
- `isReadyFromCacheSignal` - Cache ready state signal
- `isTimedOutSignal` - Timeout state signal
- `hasUpdateSignal` - Update notifications signal

## Installation

```bash
npm install @splitsoftware/splitio-angular
```

## Migration Guide

Migrating from the legacy service pattern to the provider pattern? Check out our comprehensive [Migration Guide](MIGRATION.md) with step-by-step instructions and code examples.

## Advanced Usage

### Using Signals (Angular 16+)

Signals provide a reactive way to track SDK state with better performance and simpler syntax:

```typescript
import { Component, computed, effect, inject } from '@angular/core';
import { SplitIoService } from '@splitsoftware/splitio-angular';

@Component({
  selector: 'app-feature',
  template: `
    @if (isReady()) {
      <div>SDK is ready!</div>
      @if (canShowFeature()) {
        <p>Premium feature is enabled</p>
      }
    }
    @if (isTimedOut()) {
      <div>SDK initialization timed out</div>
    }
  `
})
export class FeatureComponent {
  private splitService = inject(SplitIoService);
  
  // Use signals directly
  readonly isReady = this.splitService.isReadySignal;
  readonly isTimedOut = this.splitService.isTimedOutSignal;
  
  // Derive state using computed
  readonly canShowFeature = computed(() => {
    return this.isReady() && !this.isTimedOut();
  });
  
  // React to state changes with effects
  constructor() {
    effect(() => {
      if (this.isReady()) {
        const treatment = this.splitService.getTreatment('premium-feature');
        console.log('Feature treatment:', treatment);
      }
    });
  }
}
```

### Using Observables

For applications not using signals, Observables provide the same functionality:

```typescript
import { Component, OnInit } from '@angular/core';
import { SplitIoService } from '@splitsoftware/splitio-angular';

@Component({
  selector: 'app-feature',
  template: `
    <div *ngIf="splitService.isReady$ | async">
      SDK is ready!
    </div>
  `
})
export class FeatureComponent implements OnInit {
  constructor(public splitService: SplitIoService) {}

  ngOnInit() {
    this.splitService.isReady$.subscribe(ready => {
      if (ready) {
        const treatment = this.splitService.getTreatment('premium-feature');
        console.log('Feature treatment:', treatment);
      }
    });
  }
}
```

### Multiple Treatment Evaluation
```typescript
const treatments = splitService.getTreatments(['feature-a', 'feature-b', 'feature-c']);
if (treatments['feature-a'] === 'on' && treatments['feature-b'] === 'enabled') {
  // Both features are enabled
}
```

### Track Events
```typescript
splitService.track('purchase', 'conversion', 99.99, {
  productId: 'abc123',
  category: 'electronics'
});
```

### Guard with Custom Redirect
```typescript
const customGuard = createTreatmentGuard('premium-feature', 'on', '/upgrade');

const routes: Routes = [
  {
    path: 'premium',
    component: PremiumComponent,
    canActivate: [customGuard]
  }
];
```

## API Documentation

For detailed API documentation, see the [TypeScript definitions](projects/splitio/src/public-api.ts) or check out the [official Split.io documentation](https://help.split.io/hc/en-us/articles/6495326064397-Angular-utilities).

## Submitting issues

The Split team monitors all issues submitted to this [issue tracker](https://github.com/splitio/angular-sdk-plugin/issues). We encourage you to use this issue tracker to submit any bug reports, feedback, and feature enhancements. We'll do our best to respond in a timely manner.

## Contributing

Please see [Contributors Guide](CONTRIBUTORS-GUIDE.md) to find all you need to submit a Pull Request (PR).

## License

Licensed under the Apache License, Version 2.0. See: [Apache License](http://www.apache.org/licenses/).

## About Split

Split is the leading Feature Delivery Platform for engineering teams that want to confidently deploy features as fast as they can develop them. Split’s fine-grained management, real-time monitoring, and data-driven experimentation ensure that new features will improve the customer experience without breaking or degrading performance. Companies like Twilio, Salesforce, GoDaddy and WePay trust Split to power their feature delivery.

To learn more about Split, contact hello@split.io, or get started with feature flags for free at https://www.split.io/signup.

Split has built and maintains SDKs for:

* .NET [Github](https://github.com/splitio/dotnet-client) [Docs](https://help.split.io/hc/en-us/articles/360020240172--NET-SDK)
* Android [Github](https://github.com/splitio/android-client) [Docs](https://help.split.io/hc/en-us/articles/360020343291-Android-SDK)
* Angular [Github](https://github.com/splitio/angular-sdk-plugin) [Docs](https://help.split.io/hc/en-us/articles/6495326064397-Angular-utilities)
* Elixir thin-client [Github](https://github.com/splitio/elixir-thin-client) [Docs](https://help.split.io/hc/en-us/articles/26988707417869-Elixir-Thin-Client-SDK)
* Flutter [Github](https://github.com/splitio/flutter-sdk-plugin) [Docs](https://help.split.io/hc/en-us/articles/8096158017165-Flutter-plugin)
* GO [Github](https://github.com/splitio/go-client) [Docs](https://help.split.io/hc/en-us/articles/360020093652-Go-SDK)
* iOS [Github](https://github.com/splitio/ios-client) [Docs](https://help.split.io/hc/en-us/articles/360020401491-iOS-SDK)
* Java [Github](https://github.com/splitio/java-client) [Docs](https://help.split.io/hc/en-us/articles/360020405151-Java-SDK)
* JavaScript [Github](https://github.com/splitio/javascript-client) [Docs](https://help.split.io/hc/en-us/articles/360020448791-JavaScript-SDK)
* JavaScript for Browser [Github](https://github.com/splitio/javascript-browser-client) [Docs](https://help.split.io/hc/en-us/articles/360058730852-Browser-SDK)
* Node.js [Github](https://github.com/splitio/javascript-client) [Docs](https://help.split.io/hc/en-us/articles/360020564931-Node-js-SDK)
* PHP [Github](https://github.com/splitio/php-client) [Docs](https://help.split.io/hc/en-us/articles/360020350372-PHP-SDK)
* PHP thin-client [Github](https://github.com/splitio/php-thin-client) [Docs](https://help.split.io/hc/en-us/articles/18305128673933-PHP-Thin-Client-SDK)
* Python [Github](https://github.com/splitio/python-client) [Docs](https://help.split.io/hc/en-us/articles/360020359652-Python-SDK)
* React [Github](https://github.com/splitio/react-client) [Docs](https://help.split.io/hc/en-us/articles/360038825091-React-SDK)
* React Native [Github](https://github.com/splitio/react-native-client) [Docs](https://help.split.io/hc/en-us/articles/4406066357901-React-Native-SDK)
* Redux [Github](https://github.com/splitio/redux-client) [Docs](https://help.split.io/hc/en-us/articles/360038851551-Redux-SDK)
* Ruby [Github](https://github.com/splitio/ruby-client) [Docs](https://help.split.io/hc/en-us/articles/360020673251-Ruby-SDK)

For a comprehensive list of open source projects visit our [Github page](https://github.com/splitio?utf8=%E2%9C%93&query=%20only%3Apublic%20).

**Learn more about Split:**

Visit [split.io/product](https://www.split.io/product) for an overview of Split, or visit our documentation at [help.split.io](https://help.split.io) for more detailed information.

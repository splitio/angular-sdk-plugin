import { Injectable } from '@angular/core';
import { CanActivate, CanActivateChild, CanLoad } from '@angular/router';
import { SplitService } from './splitio.service';

@Injectable({
  providedIn: 'root'
})
export class SplitioGuard implements CanActivate, CanLoad, CanActivateChild {

  constructor(private splitService: SplitService) {}

  canActivate(): boolean {
    return this.splitService.isSDKReady;
  }

  canLoad(): boolean {
    return this.splitService.isSDKReady;
  }

  canActivateChild(): boolean {
    return this.splitService.isSDKReady;
  }
}

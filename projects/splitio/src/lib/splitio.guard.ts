import { Injectable } from '@angular/core';
import { CanActivate } from '@angular/router';
import { SplitioService } from './splitio.service';

@Injectable({
  providedIn: 'root'
})
export class SplitioGuard implements CanActivate {

  constructor(private splitService: SplitioService) {}

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

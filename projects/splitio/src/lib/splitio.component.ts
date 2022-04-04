import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'lib-splitio',
  template: `
    <p>
      splitio works!
    </p>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [
  ]
})
export class SplitioComponent {}

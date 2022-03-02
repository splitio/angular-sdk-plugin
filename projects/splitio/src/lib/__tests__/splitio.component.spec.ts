import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SplitioComponent } from '../splitio.component';

describe('SplitioComponent', () => {
  let component: SplitioComponent;
  let fixture: ComponentFixture<SplitioComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SplitioComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SplitioComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FeedbackInsightsComponent } from './feedback-insights.component';

describe('FeedbackInsightsComponent', () => {
  let component: FeedbackInsightsComponent;
  let fixture: ComponentFixture<FeedbackInsightsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FeedbackInsightsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FeedbackInsightsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';

import { FeedbackInsightsComponent } from './feedback-insights.component';

describe('FeedbackInsightsComponent', () => {
  let component: FeedbackInsightsComponent;
  let fixture: ComponentFixture<FeedbackInsightsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FeedbackInsightsComponent, HttpClientTestingModule]
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

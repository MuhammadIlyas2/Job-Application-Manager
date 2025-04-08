import { Component, OnInit } from '@angular/core';
import { AnalyticsService } from '../../services/analytics.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-feedback-insights',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="feedback-insights">
      <h2>Feedback Insights</h2>
      <div *ngIf="feedbackData">
        <div class="feedback-counts">
          <h3>Feedback Counts by Category</h3>
          <div *ngFor="let fc of feedbackData.feedback_counts">
            <strong>{{ fc.name }}:</strong> {{ fc.count }}
          </div>
        </div>
        <div class="top-strengths">
          <h3>Top Strengths</h3>
          <div *ngFor="let strength of feedbackData.top_strengths">
            <span>{{ strength.strength }} ({{ strength.count }})</span>
          </div>
        </div>
        <div class="top-improvements">
          <h3>Top Improvements</h3>
          <div *ngFor="let improvement of feedbackData.top_improvements">
            <span>{{ improvement.improvement }} ({{ improvement.count }})</span>
          </div>
        </div>
      </div>
      <div *ngIf="errorMessage" class="error">{{ errorMessage }}</div>
    </div>
  `,
  styleUrls: ['./feedback-insights.component.css']
})
export class FeedbackInsightsComponent implements OnInit {
  feedbackData: any;
  errorMessage: string = '';

  constructor(private analyticsService: AnalyticsService) {}

  ngOnInit(): void {
    this.analyticsService.getFeedbackInsights().subscribe({
      next: res => { this.feedbackData = res; },
      error: err => { this.errorMessage = 'Failed to load feedback insights'; console.error(err); }
    });
  }
}

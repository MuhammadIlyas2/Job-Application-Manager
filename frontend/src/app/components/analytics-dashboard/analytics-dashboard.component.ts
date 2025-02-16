import { Component } from '@angular/core';
import { AnalyticsService } from '../../services/analytics.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-analytics-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './analytics-dashboard.component.html',
  styleUrl: './analytics-dashboard.component.css'
})
export class AnalyticsDashboardComponent {
  analyticsData: any;
  errorMessage = '';

  constructor(private analyticsService: AnalyticsService) { }

  ngOnInit(): void {
    // For example, fetching analytics data for "Software Engineer" roles
    this.analyticsService.getRoleAnalytics('Software Engineer').subscribe(
      res => this.analyticsData = res,
      err => {
        console.error(err);
        this.errorMessage = 'Error fetching analytics data';
      }
    );
  }
}

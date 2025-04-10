// analytics-dashboard.component.ts
import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { AnalyticsService } from '../../services/analytics.service';
import { Chart, registerables } from 'chart.js';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
Chart.register(...registerables);

@Component({
  selector: 'app-analytics-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './analytics-dashboard.component.html',
  styleUrls: ['./analytics-dashboard.component.css']
})
export class AnalyticsDashboardComponent implements OnInit {
  overview: any = {};
  statusTrends: any[] = [];
  errorMessage: string = '';

  // Animated metric value (used for the card)
  animatedMetric: number = 0;
  // Which metric is selected; 'total' (default) or 'active'
  selectedMetric: 'total' | 'active' = 'total';

  @ViewChild('statusDistributionChart') statusDistributionChartRef!: ElementRef;
  @ViewChild('statusTrendsChart') statusTrendsChartRef!: ElementRef;

  statusDistributionChart!: Chart;
  statusTrendsChart!: Chart;

  constructor(private analyticsService: AnalyticsService) {}

  ngOnInit(): void {
    // Load overall metrics and animate the metric value based on selectedMetric.
    this.analyticsService.getOverview().subscribe({
      next: res => {
        this.overview = res;
        // Animate from 0 to the current metric value (total by default)
        this.animateMetricValue(this.getCurrentMetricValue(), 2000);
        setTimeout(() => this.renderStatusDistributionChart(), 0);
      },
      error: err => {
        this.errorMessage = 'Failed to load overview metrics';
        console.error(err);
      }
    });

    // Load status trends and render them.
    this.analyticsService.getStatusTrends().subscribe({
      next: res => {
        this.statusTrends = res;
        setTimeout(() => this.renderStatusTrendsChart(), 0);
      },
      error: err => {
        this.errorMessage = 'Failed to load status trends';
        console.error(err);
      }
    });
  }

  // Returns the target metric value based on the selection.
  // For total, use total_applications; for active, sum up those in 'applied', 'interview' and 'offer'.
  getCurrentMetricValue(): number {
    if (this.selectedMetric === 'total') {
      return this.overview.total_applications || 0;
    } else {
      const counts = this.overview.status_counts || {};
      const active = (counts['applied'] || 0) + (counts['interview'] || 0) + (counts['offer'] || 0);
      return active;
    }
  }

  // Animate the displayed metric value from 0 up to the target over the given duration (ms)
  animateMetricValue(target: number, duration: number): void {
    let start = 0;
    const stepTime = 50; // update every 50ms
    const steps = duration / stepTime;
    const increment = target / steps;
    
    const interval = setInterval(() => {
      start += increment;
      if (start >= target) {
        start = target;
        clearInterval(interval);
      }
      this.animatedMetric = Math.floor(start);
    }, stepTime);
  }

  // Called when the user switches which metric to display.
  onMetricChange(metric: 'total' | 'active'): void {
    if (this.selectedMetric !== metric) {
      this.selectedMetric = metric;
      // Animate the new value from 0 to the target value.
      this.animateMetricValue(this.getCurrentMetricValue(), 2000);
    }
  }

  renderStatusDistributionChart(): void {
    if (this.statusDistributionChart) {
      this.statusDistributionChart.destroy();
    }
    const labels = Object.keys(this.overview.status_counts || {});
    const data = labels.map(key => this.overview.status_counts[key]);
    this.statusDistributionChart = new Chart(this.statusDistributionChartRef.nativeElement, {
      type: 'pie',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: ['lightblue', 'orange', 'lightgreen', 'green', 'red']
        }]
      },
      options: {
        plugins: {
          legend: { position: 'bottom' },
          title: { display: true, text: 'Status Distribution' }
        }
      }
    });
  }

  renderStatusTrendsChart(): void {
    if (this.statusTrendsChart) {
      this.statusTrendsChart.destroy();
    }
    // Group trends by status; for each status, build an array of { date, count }
    const statusMap: { [key: string]: { date: string, count: number }[] } = {};
    this.statusTrends.forEach(trend => {
      if (!statusMap[trend.status]) {
        statusMap[trend.status] = [];
      }
      statusMap[trend.status].push({ 
        date: new Date(trend.status_date).toLocaleDateString(), 
        count: trend.count
      });
    });
    // Build a sorted set of all dates
    const allDatesSet = new Set<string>();
    Object.values(statusMap).forEach(arr => {
      arr.forEach(item => allDatesSet.add(item.date));
    });
    const allDates = Array.from(allDatesSet).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
    // Build datasets: one per status
    const datasets = Object.keys(statusMap).map(status => {
      const data = allDates.map(date => {
        const item = statusMap[status].find(d => d.date === date);
        return item ? item.count : 0;
      });
      const colors: { [key: string]: string } = {
        'interview': 'orange',
        'offer': 'lightgreen',
        'accepted': 'green',
        'rejected': 'red'
      };
      return {
        label: status,
        data: data,
        borderColor: colors[status] || 'grey',
        backgroundColor: colors[status] || 'grey',
        fill: false
      };
    });
    this.statusTrendsChart = new Chart(this.statusTrendsChartRef.nativeElement, {
      type: 'line',
      data: {
        labels: allDates,
        datasets: datasets
      },
      options: {
        plugins: {
          legend: { position: 'bottom' },
          title: { display: true, text: 'Status Transitions Over Time' }
        },
        scales: {
          x: { title: { display: true, text: 'Date' } },
          y: { title: { display: true, text: '# of Transitions' }, beginAtZero: true }
        }
      }
    });
  }
}

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

  animatedMetric: number = 0;
  selectedMetric: 'total' | 'active' = 'total';

  @ViewChild('statusDistributionChart') statusDistributionChartRef!: ElementRef;
  @ViewChild('statusTrendsChart') statusTrendsChartRef!: ElementRef;

  statusDistributionChart!: Chart;
  statusTrendsChart!: Chart;

  constructor(private analyticsService: AnalyticsService) {}

  ngOnInit(): void {
    this.analyticsService.getOverview().subscribe({
      next: res => {
        this.overview = res;
        this.animateMetricValue(this.getCurrentMetricValue(), 2000);
        setTimeout(() => this.renderStatusDistributionChart(), 0);
      },
      error: err => {
        this.errorMessage = 'Failed to load overview metrics';
        console.error(err);
      }
    });

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

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  getCurrentMetricValue(): number {
    if (this.selectedMetric === 'total') {
      return this.overview.total_applications || 0;
    } else {
      const counts = this.overview.status_counts || {};
      return (counts['applied'] || 0) + (counts['interview'] || 0) + (counts['offer'] || 0);
    }
  }

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

  onMetricChange(metric: 'total' | 'active'): void {
    if (this.selectedMetric !== metric) {
      this.selectedMetric = metric;
      this.animateMetricValue(this.getCurrentMetricValue(), 2000);
    }
  }

  renderStatusDistributionChart(): void {
    if (this.statusDistributionChart) {
      this.statusDistributionChart.destroy();
    }
    const labels = Object.keys(this.overview.status_counts || {});
    const data = labels.map(key => this.overview.status_counts[key]);
    const colorMapping: { [key: string]: string } = {
      'applied': 'lightblue',
      'interview': 'orange',
      'offer': 'lightgreen',
      'accepted': 'green',
      'rejected': 'red'
    };
    const backgroundColors = labels.map(label => colorMapping[label.toLowerCase()] || 'grey');

    this.statusDistributionChart = new Chart(this.statusDistributionChartRef.nativeElement, {
      type: 'pie',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: backgroundColors
        }]
      },
      options: {
        plugins: {
          legend: { position: 'bottom' },
          title: { display: false }
        }
      }
    });
  }

  renderStatusTrendsChart(): void {
    if (this.statusTrendsChart) {
      this.statusTrendsChart.destroy();
    }
    const statusMap: { [key: string]: { date: string, count: number }[] } = {};
    this.statusTrends.forEach(trend => {
      if (!statusMap[trend.status]) {
        statusMap[trend.status] = [];
      }
      const formattedDate = this.formatDate(new Date(trend.status_date));
      statusMap[trend.status].push({ 
        date: formattedDate,
        count: trend.count
      });
    });
    const allDatesSet = new Set<string>();
    Object.values(statusMap).forEach(arr => {
      arr.forEach(item => allDatesSet.add(item.date));
    });
    const allDates = Array.from(allDatesSet).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
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
        borderColor: colors[status.toLowerCase()] || 'grey',
        backgroundColor: colors[status.toLowerCase()] || 'grey',
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
          title: { display: false }
        },
        scales: {
          x: { title: { display: true, text: 'Date' } },
          y: { title: { display: true, text: '# of Transitions' }, beginAtZero: true }
        }
      }
    });
  }
}

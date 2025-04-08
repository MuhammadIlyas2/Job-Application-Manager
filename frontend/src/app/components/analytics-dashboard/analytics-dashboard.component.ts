import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { AnalyticsService } from '../../services/analytics.service';
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

@Component({
  selector: 'app-analytics-dashboard',
  templateUrl: './analytics-dashboard.component.html',
  styleUrls: ['./analytics-dashboard.component.css']
})
export class AnalyticsDashboardComponent implements OnInit {
  overview: any = {};
  statusTrends: any[] = [];
  errorMessage: string = '';
  
  // New property for animated total
  animatedTotal: number = 0;

  @ViewChild('statusDistributionChart') statusDistributionChartRef!: ElementRef;
  @ViewChild('statusTrendsChart') statusTrendsChartRef!: ElementRef;

  statusDistributionChart!: Chart;
  statusTrendsChart!: Chart;

  constructor(private analyticsService: AnalyticsService) {}

  ngOnInit(): void {
    // Load overall metrics and animate the total applications count.
    this.analyticsService.getOverview().subscribe({
      next: res => {
        this.overview = res;
        this.animateTotalApplications(this.overview.total_applications, 2000); // 2-second animation
        setTimeout(() => {
          this.renderStatusDistributionChart();
        }, 0);
      },
      error: err => {
        this.errorMessage = 'Failed to load overview metrics';
        console.error(err);
      }
    });

    // Load status trends and render the trends chart.
    this.analyticsService.getStatusTrends().subscribe({
      next: res => {
        this.statusTrends = res;
        setTimeout(() => {
          this.renderStatusTrendsChart();
        }, 0);
      },
      error: err => {
        this.errorMessage = 'Failed to load status trends';
        console.error(err);
      }
    });
  }

  animateTotalApplications(target: number, duration: number): void {
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
      this.animatedTotal = Math.floor(start);
    }, stepTime);
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
          backgroundColor: ['lightblue','orange','lightgreen','green','red']
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

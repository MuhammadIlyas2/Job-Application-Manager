import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { AnalyticsService } from '../../services/analytics.service';
import { Chart, registerables, ChartConfiguration } from 'chart.js';
import { saveAs } from 'file-saver';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RoleService } from '../../services/role.service';
Chart.register(...registerables);

interface TopStrength {
  strength: string;
  count: number;
}

interface TopImprovement {
  improvement: string;
  count: number;
}

@Component({
  selector: 'app-feedback-insights',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './feedback-insights.component.html',
  styleUrls: ['./feedback-insights.component.css']
})
export class FeedbackInsightsComponent implements OnInit {
  feedbackInsights: any = {};
  roles: string[] = [];
  selectedRole: string = '';
  errorMessage: string = '';

  @ViewChild('categoryChart') categoryChartRef!: ElementRef;
  @ViewChild('strengthsChart') strengthsChartRef!: ElementRef;
  @ViewChild('improvementsChart') improvementsChartRef!: ElementRef;

  private categoryChart!: Chart;
  private strengthsChart!: Chart;
  private improvementsChart!: Chart;

  constructor(private analyticsService: AnalyticsService) {}

  ngOnInit(): void {
    this.analyticsService.getAvailableRoles().subscribe({
      next: (roles: string[]) => {
        this.roles = roles;
        this.loadFeedbackInsights();
      },
      error: err => {
        console.error('Failed to load roles', err);
        this.errorMessage = 'Couldn’t load roles';
      }
    });
  }

  onRoleChange(): void {
    this.loadFeedbackInsights();
  }

  loadFeedbackInsights(): void {
    this.analyticsService.getFeedbackInsightsByRole(
      this.selectedRole || undefined
    ).subscribe({
      next: insights => {
        this.feedbackInsights = insights;
        setTimeout(() => {
          this.renderCategoryChart();
          this.renderStrengthsChart();
          this.renderImprovementsChart();
        }, 0);
      },
      error: err => {
        console.error('Failed to load feedback insights', err);
        this.errorMessage = 'Failed to load feedback insights';
      }
    });
  }


  renderCategoryChart(): void {
    if (this.categoryChart) {
      this.categoryChart.destroy();
    }
    const counts: { [key: string]: number } = this.feedbackInsights.feedback_counts || {};
    const labels: string[] = Object.keys(counts);
    const data: number[] = labels.map((key: string) => counts[key]);

    const backgroundColors: string[] = labels.map((label: string) => {
      const lower = label.toLowerCase();
      if (lower === 'positive') {
        return 'green';
      } else if (lower === 'negative') {
        return 'red';
      } else if (lower === 'neutral') {
        return 'grey';
      } else {
        return 'blue'; 
      }
    });

    const config: ChartConfiguration = {
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
    };

    this.categoryChart = new Chart(this.categoryChartRef.nativeElement, config);
  }

  renderStrengthsChart(): void {
    if (!this.feedbackInsights.top_strengths) return;
    if (this.strengthsChart) {
      this.strengthsChart.destroy();
    }
    const strengthsArray = this.feedbackInsights.top_strengths as TopStrength[];
    const sortedStrengths = strengthsArray.sort((a: TopStrength, b: TopStrength) =>
      a.strength.toLowerCase().localeCompare(b.strength.toLowerCase())
    );
    const labels: string[] = sortedStrengths.map((item: TopStrength) => item.strength);
    const data: number[] = sortedStrengths.map((item: TopStrength) => item.count);

    const config: ChartConfiguration = {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Top Strengths',
          data: data,
          backgroundColor: 'lightgreen'
        }]
      },
      options: {
        plugins: {
          legend: { display: false },
          title: { display: false } 
        },
        scales: { y: { beginAtZero: true } }
      }
    };

    this.strengthsChart = new Chart(this.strengthsChartRef.nativeElement, config);
  }

  renderImprovementsChart(): void {
    if (!this.feedbackInsights.top_improvements) return;
    if (this.improvementsChart) {
      this.improvementsChart.destroy();
    }
    const improvementsArray = this.feedbackInsights.top_improvements as TopImprovement[];
    const labels: string[] = improvementsArray.map((item: TopImprovement) => item.improvement);
    const data: number[] = improvementsArray.map((item: TopImprovement) => item.count);

    const config: ChartConfiguration = {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Top Improvements',
          data: data,
          backgroundColor: 'orange'
        }]
      },
      options: {
        plugins: {
          legend: { display: false },
          title: { display: false } 
        },
        scales: { y: { beginAtZero: true } }
      }
    };

    this.improvementsChart = new Chart(this.improvementsChartRef.nativeElement, config);
  }

  exportData(): void {
    // Export detailed feedback to CSV.
    const csvRows: string[] = [];
    const headers = ['Job Title', 'Company', 'Status', 'Feedback Summary', 'Detailed Feedback', 'Created At'];
    csvRows.push(headers.join(','));
    (this.feedbackInsights.detailed_feedback || []).forEach((entry: any) => {
      const row = [
        `"${entry.job_title}"`,
        `"${entry.company}"`,
        entry.status,
        `"${this.getDisplayText(entry.notes, 'No summary')}"`,
        `"${this.getDisplayText(entry.detailed_feedback, 'No details')}"`,
        entry.created_at
      ];
      csvRows.push(row.join(','));
    });
    const csvData = csvRows.join('\n');
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, 'FeedbackInsights.csv');
  }

  isValidText(value: string | null | undefined): boolean {
    if (!value) return false;
    const trimmed = value.trim();
    const normalized = trimmed.replace(/[\u200B-\u200D\uFEFF]/g, '');
    return /^[A-Za-z]/.test(normalized);
  }

  getDisplayText(value: string | null | undefined, fallback: string = 'N/A'): string {
    return this.isValidText(value) ? value!.trim() : fallback;
  }
}

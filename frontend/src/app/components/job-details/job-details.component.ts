import { Component } from '@angular/core';
import { JobService } from '../../services/job.service';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-job-details',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './job-details.component.html',
  styleUrls: ['./job-details.component.css']
})
export class JobDetailsComponent {
  job: any = null;
  feedbackStrengths: { priority: string; additional: string[] } = { priority: '', additional: [] };
  feedbackImprovements: { priority: string; additional: string[] } = { priority: '', additional: [] };
  interviewQuestions: any[] = [];
  jobStatusHistory: any[] = [];
  errorMessage = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private jobService: JobService
  ) {}

  ngOnInit(): void {
    this.loadJobDetails();
  }

  loadJobDetails(): void {
    const jobId = this.route.snapshot.paramMap.get('id');
    if (jobId) {
      this.jobService.getJobById(+jobId).subscribe({
        next: (res) => {
          res.applied_date = res.applied_date ? this.formatDate(res.applied_date) : 'N/A';
          this.job = res;
          this.loadFeedbackStrengths(+jobId);
          this.loadFeedbackImprovements(+jobId);
          this.loadInterviewQuestions(+jobId);
          this.loadJobStatusHistory(+jobId);
        },
        error: err => {
          console.error(err);
          this.errorMessage = 'Error fetching job details';
        }
      });
    }
  }

  loadFeedbackStrengths(jobId: number): void {
    this.jobService.getFeedbackStrengths(jobId).subscribe({
      next: (res) => {
        this.feedbackStrengths = res;
      },
      error: err => {
        console.error(err);
        this.errorMessage = 'Error fetching feedback strengths';
      }
    });
  }

  loadFeedbackImprovements(jobId: number): void {
    this.jobService.getFeedbackImprovements(jobId).subscribe({
      next: (res) => {
        this.feedbackImprovements = res;
      },
      error: err => {
        console.error(err);
        this.errorMessage = 'Error fetching feedback improvements';
      }
    });
  }

  loadInterviewQuestions(jobId: number): void {
    this.jobService.getInterviewQAs(jobId).subscribe({
      next: (res) => {
        this.interviewQuestions = res;
      },
      error: err => {
        console.error(err);
        this.errorMessage = 'Error fetching interview questions';
      }
    });
  }

  loadJobStatusHistory(jobId: number): void {
    this.jobService.getJobStatusHistory(jobId).subscribe({
      next: (res) => {
        this.jobStatusHistory = res;
      },
      error: err => {
        console.error(err);
        this.errorMessage = 'Error fetching job status history';
      }
    });
  }

  getStatusDate(status: string): string {
    if (status === 'applied') {
      return this.job.applied_date ? this.job.applied_date : 'N/A';
    }
    const record = this.jobStatusHistory.find((h: any) => h.status === status);
    return record && record.status_date ? this.formatDate(record.status_date) : '--';
  }

  private formatDate(dateStr: string): string {
    const dateObj = new Date(dateStr);
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'numeric', day: 'numeric' };
    return dateObj.toLocaleDateString('en-US', options);
  }

  goBack(): void {
    this.router.navigate(['/jobs']);
  }
}

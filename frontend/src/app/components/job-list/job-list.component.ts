import { Component } from '@angular/core';
import { JobService } from '../../services/job.service';
import { AuthService } from '../../services/auth.service';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-job-list',
  standalone: true,
  imports: [RouterLink, CommonModule],
  templateUrl: './job-list.component.html',
  styleUrl: './job-list.component.css'
})
export class JobListComponent {
  jobs: any[] = [];
  errorMessage = '';

  constructor(
    private jobService: JobService, 
    private authService: AuthService,  
    private router: Router
  ) { }

  ngOnInit(): void {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }
    this.loadJobs();
  }

  loadJobs(): void {
    this.jobService.getJobs().subscribe(
      res => {
        this.jobs = res;
      },
      err => {
        if (err.status === 401) {
          console.log("🔴 Session expired. Redirecting to login...");
          this.authService.logout();
          this.router.navigate(['/login']);
        } else {
          console.error(err);
          this.errorMessage = 'Error loading jobs';
        }
      }
    );
  }

  deleteJob(jobId: number): void {
    if (confirm('Are you sure you want to delete this job?')) {
      this.jobService.deleteJob(jobId).subscribe(
        res => {
          console.log('Job deleted');
          this.loadJobs();
        },
        err => {
          if (err.status === 401) {
            console.log("🔴 Session expired. Redirecting to login...");
            this.authService.logout();
            this.router.navigate(['/login']);
          } else {
            console.error(err);
            this.errorMessage = 'Error deleting job';
          }
        }
      );
    }
  }
  goToJobDetails(jobId: number): void {
    this.router.navigate([`/jobs/${jobId}`]);  // ✅ Ensure navigation to job details works
  }
}

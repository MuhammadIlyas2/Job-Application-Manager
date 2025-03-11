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
  errorMessage = '';

  constructor(
    private route: ActivatedRoute, 
    private router: Router,  
    private jobService: JobService
  ) { }

  ngOnInit(): void {
    this.loadJobDetails();
  }

  loadJobDetails(): void {
    const jobId = this.route.snapshot.paramMap.get('id');
    if (jobId) {
      this.jobService.getJobById(+jobId).subscribe(
        res => {
          console.log("✅ Loaded Job Data:", res);  // Debugging log
          this.job = res;
        },
        err => {
          console.error(err);
          this.errorMessage = 'Error fetching job details';
        }
      );
    }
  }

  goBack(): void {
    this.router.navigate(['/jobs']);
  }
}

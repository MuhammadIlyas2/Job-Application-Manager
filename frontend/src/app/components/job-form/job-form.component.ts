import { Component } from '@angular/core';
import { JobService } from '../../services/job.service';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-job-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './job-form.component.html',
  styleUrl: './job-form.component.css'
})
export class JobFormComponent {
  roles = ['Frontend Developer', 'Backend Developer', 'Data Scientist'];
  job: any = {
    roleType: '',
    jobTitle: '',
    company: '',
    status: 'Applied',
    feedback: {}
  };
  isEditMode = false;

  constructor(private jobService: JobService, private route: ActivatedRoute, private router: Router) {}

  ngOnInit(): void {
    const jobId = this.route.snapshot.paramMap.get('id');
    if (jobId) {
      this.isEditMode = true;
      this.jobService.getJobById(+jobId).subscribe(
        res => this.job = res,
        err => console.error('Error fetching job details')
      );
    }
  }

  submitForm(): void {
    if (this.isEditMode) {
      this.jobService.updateJob(this.job.id, this.job).subscribe(() => this.router.navigate(['/jobs']));
    } else {
      this.jobService.createJob(this.job).subscribe(() => this.router.navigate(['/jobs']));
    }
  }
}


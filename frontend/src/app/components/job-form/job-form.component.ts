import { Component } from '@angular/core';
import { JobService } from '../../services/job.service';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service'; // 🔹 Import AuthService

@Component({
  selector: 'app-job-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './job-form.component.html',
  styleUrl: './job-form.component.css'
})
export class JobFormComponent {
  job: any = {
    user_id: '',  // 🔹 Ensure user_id exists
    job_title: '',
    company: '',
    role_category: '',
    status: 'applied',
    feedback: ''
  };
  isEditMode = false;
  errorMessage = '';
  currentUser: any;  // 🔹 Store logged-in user info

  constructor(
    private jobService: JobService, 
    private authService: AuthService,  // 🔹 Inject AuthService
    private route: ActivatedRoute, 
    private router: Router
  ) { }

  ngOnInit(): void {
    const jobId = this.route.snapshot.paramMap.get('id');

    // 🔹 Fetch logged-in user details and set user_id
    this.authService.getCurrentUser().subscribe(
      user => {
        this.currentUser = user;
        this.job.user_id = user.id;  // ✅ Set user_id for new jobs

        if (jobId) {
          this.isEditMode = true;
          this.jobService.getJobById(+jobId).subscribe(
            res => {
              this.job = res;

              // ✅ Ensure the user ID is correctly set when editing
              this.job.user_id = res.user_id;
            },
            err => {
              console.error(err);
              this.errorMessage = 'Error fetching job details for editing';
            }
          );
        }
      },
      err => {
        console.error(err);
        this.errorMessage = 'Error fetching user details';
      }
    );
  }

  submitForm(): void {
    if (this.isEditMode) {
      this.jobService.updateJob(this.job.id, this.job).subscribe(
        res => {
          console.log('Job updated', res);
          this.router.navigate(['/jobs']);
        },
        err => {
          console.error(err);
          this.errorMessage = 'Error updating job';
        }
      );
    } else {
      // 🔹 Ensure user_id is included in the job creation request
      this.jobService.createJob(this.job).subscribe(
        res => {
          console.log('Job created', res);
          this.router.navigate(['/jobs']);
        },
        err => {
          console.error(err);
          this.errorMessage = 'Error creating job';
        }
      );
    }
  }
}

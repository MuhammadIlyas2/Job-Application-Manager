import { Component } from '@angular/core';
import { JobService } from '../../services/job.service';
import { AuthService } from '../../services/auth.service';  // 🔹 Import AuthService
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-job-details',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './job-details.component.html',
  styleUrl: './job-details.component.css'
})
export class JobDetailsComponent {
  job: any;
  errorMessage = '';
  userId: number | null = null;  // 🔹 Store logged-in user's ID

  constructor(
    private route: ActivatedRoute, 
    private router: Router,  
    private authService: AuthService,  // 🔹 Inject AuthService
    private jobService: JobService
  ) { }

  ngOnInit(): void {
    // 🔹 Get logged-in user ID
    this.authService.getCurrentUser().subscribe(
      user => {
        this.userId = user.id;  // ✅ Store user ID
        this.loadJobDetails();
      },
      err => {
        console.error(err);
        this.errorMessage = 'Error fetching user details';
      }
    );
  }

  loadJobDetails(): void {
    const jobId = this.route.snapshot.paramMap.get('id');
    if (jobId) {
      this.jobService.getJobById(+jobId).subscribe(
        res => {
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
    if (this.userId) {
      this.router.navigate([`/jobs`], { queryParams: { user_id: this.userId } });  // ✅ Include user_id in query params
    } else {
      this.router.navigate(['/login']);  // 🔹 Fallback if user_id is missing
    }
  }
}

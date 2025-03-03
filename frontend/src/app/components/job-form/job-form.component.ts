import { Component } from '@angular/core';
import { JobService } from '../../services/job.service';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { RoleService } from '../../services/role.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-job-form',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './job-form.component.html',
  styleUrls: ['./job-form.component.css']
})
export class JobFormComponent {
  job: any = {
    job_title: '',
    company: '',
    role_category: '',
    status: 'applied',
    general_notes: '',
    applied_date: new Date().toISOString().split('T')[0],
    feedback: {
      notes: '',
      category_id: null
    }
  };

  feedbackCategories: any[] = []; // Load from API

  isEditMode = false;
  errorMessage = '';
  roles: any[] = []; // Initialize as empty array
  statuses = ['applied', 'interview', 'offer', 'accepted', 'rejected'];
  feedbackTypes: Record<string, string[]> = {
    rejected: ['Technical Skills', 'Cultural Fit', 'Experience Gap'],
    accepted: ['Technical Strength', 'Cultural Alignment'],
    offer: ['Technical Strength', 'Cultural Alignment'] // ✅ Same as accepted
  };

  constructor(
    private jobService: JobService,
    private route: ActivatedRoute,
    public router: Router,
    private authService: AuthService,
    private roleService: RoleService
  ) {}

  ngOnInit(): void {
    this.roles = this.roleService.getRoles();
    this.loadFeedbackCategories();

    const jobId = this.route.snapshot.paramMap.get('id');
    if (jobId) {
      this.isEditMode = true;
      this.loadJob(jobId);
    } else {
      this.setCurrentUser();
    }
  }

  private loadFeedbackCategories(): void {
    this.jobService.getFeedbackCategories().subscribe({
      next: (res) => this.feedbackCategories = res,
      error: (err) => console.error('Failed to load categories', err)
    });
  }

  private loadJob(jobId: string): void {
    this.jobService.getJobById(+jobId).subscribe({
      next: (res) => {
        this.job = res;
        this.job.applied_date = new Date(res.applied_date).toISOString().split('T')[0];

        // ✅ Ensure feedback & notes are included if available
        this.job.feedback = res.feedback ? res.feedback.substring(0, 50) : ''; 
        this.job.general_notes = res.general_notes || ''; 
      },
      error: (err) => this.handleError(err)
    });
  }

  private setCurrentUser(): void {
    this.authService.getCurrentUser().subscribe({
      next: (user) => this.job.user_id = user.id,
      error: (err) => this.handleError(err)
    });
  }

  submitForm(): void {
    const jobData = {
      ...this.job,
      feedback: this.job.feedback.notes ? this.job.feedback : null
    };

    const operation = this.isEditMode 
      ? this.jobService.updateJob(this.job.id, jobData)
      : this.jobService.createJob(jobData);

    operation.subscribe({
      next: (res) => this.handleFeedback(res.id),
      error: (err) => this.handleError(err)
    });
  }

  private handleFeedback(jobId: number): void {
    if (!this.job.feedback.notes) {
      this.router.navigate(['/jobs']);
      return;
    }

    const feedbackData = {
      category_id: this.job.feedback.category_id,
      notes: this.job.feedback.notes.substring(0, 500)
    };

    const feedbackOperation = this.isEditMode
      ? this.jobService.updateFeedback(jobId, feedbackData)
      : this.jobService.createFeedback(jobId, feedbackData);

    feedbackOperation.subscribe({
      next: () => this.router.navigate(['/jobs']),
      error: (err) => {
        console.error('Feedback save failed', err);
        this.errorMessage += '\nFailed to save feedback details';
      }
    });
  }
  

  private handleError(err: any): void {
    this.errorMessage = err.error?.message || 'Operation failed. Please try again.';
    console.error(err);
  }


}

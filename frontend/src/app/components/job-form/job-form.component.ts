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
    status: 'applied',
    general_notes: '',
    feedbackSummary: '',  // Short summary (50 chars)
    feedback: {
      notes: '',
      category_id: null,
      detailed_feedback: '',
      key_improvements: '',
      key_strengths: ''
    }
  };

  feedbackCategories: any[] = [];
  isEditMode = false;
  errorMessage = '';
  roles: any[] = [];
  statuses = ['applied', 'interview', 'offer', 'accepted', 'rejected'];

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
      next: (res) => {
        this.feedbackCategories = res;
        console.log('Loaded feedback categories:', res);
      },
      error: (err) => {
        console.error('Failed to load categories', err);
        this.errorMessage = 'Failed to load feedback categories';
      }
    });
  }

  private loadJob(jobId: string): void {
    this.jobService.getJobById(+jobId).subscribe({
      next: (res) => {
        this.job = res;
        this.job.applied_date = new Date(res.applied_date).toISOString().split('T')[0];
        
        // Split notes into summary and details
        if (res.feedback?.notes) {
          const [summary, ...details] = res.feedback.notes.split('\n\n');
          this.job.feedbackSummary = summary;
          this.job.feedback.notes = details;
        } else {
          this.job.feedbackSummary = '';
          this.job.feedback.notes = '';
        }
        
        this.job.general_notes = res.general_notes || '';
      },
      error: (err) => this.handleError(err)
    });
  }

  submitForm(): void {
    // Combine feedback fields with double newline separator
    const combinedNotes = [
      this.job.feedbackSummary,
      this.job.feedback.notes
    ].filter(text => text.trim()).join('\n\n');
  
    const jobData = { ...this.job };

    
    // Remove feedback from job data
    const feedbackData = {
      notes: this.job.feedbackSummary.substring(0, 50),
      category_id: this.job.feedback.category_id,
      detailed_feedback: this.job.feedback.detailed_feedback,
      key_improvements: this.job.status === 'rejected' ? this.job.feedback.key_improvements : '',
      key_strengths: (this.job.status === 'accepted' || this.job.status === 'offer') ? this.job.feedback.key_strengths : ''
    };
    delete jobData.feedback;

    const operation = this.isEditMode 
      ? this.jobService.updateJob(this.job.id, jobData)
      : this.jobService.createJob(jobData);

      operation.subscribe({
        next: (res) => {
          const jobId = this.isEditMode ? this.job.id : res.job.id;
          if (feedbackData.notes.trim() || feedbackData.category_id) {
            this.handleFeedback(jobId, feedbackData);
          } else {
            this.router.navigate(['/jobs']);
          }
        },
        error: (err) => this.handleError(err)
      });
    }

  private handleFeedback(jobId: number, feedbackData: any): void {
    const operation = this.job.feedback?.id
      ? this.jobService.updateFeedback(jobId, feedbackData)
      : this.jobService.createFeedback(jobId, feedbackData);

    operation.subscribe({
      next: () => this.router.navigate(['/jobs']),
      error: (err) => {
        console.error('Feedback save failed', err);
        this.errorMessage += '\nFailed to save feedback details';
      }
    });
  }

  private setCurrentUser(): void {
    this.authService.getCurrentUser().subscribe({
      next: (user) => this.job.user_id = user.id,
      error: (err) => this.handleError(err)
    });
  }

  private handleError(err: any): void {
    this.errorMessage = err.error?.message || 'Operation failed. Please try again.';
    console.error(err);
  }
}
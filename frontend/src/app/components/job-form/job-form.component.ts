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
    feedbackSummary: '', // short summary
    feedback: {
      notes: '',
      category_id: null,
      detailed_feedback: '',
      key_improvements: '',
      key_strengths: ''
    }
  };

  feedbackCategories: any[] = [];
  filteredCategories: any[] = [];
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

    // Default status if none provided
    if (!this.job.status) {
      this.job.status = 'applied';
    }
  }

  private loadFeedbackCategories(): void {
    this.jobService.getFeedbackCategories().subscribe({
      next: (res) => {
        this.feedbackCategories = res;
        this.filterCategories(); // filter after loading
      },
      error: (err) => {
        console.error('Failed to load categories:', err);
        this.errorMessage = 'Failed to load feedback categories';
      }
    });
  }

  // Filter categories based on status
  filterCategories(): void {
    if (!this.feedbackCategories || this.feedbackCategories.length === 0) {
      return;
    }

    let allowedTypes: string[] = [];

    if (this.job.status === 'offer' || this.job.status === 'accepted') {
      allowedTypes = ['positive', 'neutral'];
    } else if (this.job.status === 'rejected') {
      allowedTypes = ['negative', 'neutral'];
    } else {
      allowedTypes = ['positive', 'negative', 'neutral']; // for 'applied', 'interview'
    }

    this.filteredCategories = this.feedbackCategories.filter(cat => {
      const categoryType = (cat.type || '').trim().toLowerCase();
      return allowedTypes.includes(categoryType);
    });
  }

  // Called whenever status changes
  onStatusChange(): void {
    if (!this.job.status) {
      this.job.status = 'applied';
    }
    this.filterCategories();
  }

  private loadJob(jobId: string): void {
    this.jobService.getJobById(+jobId).subscribe({
      next: (res) => {
        // Assign feedback with its id (if it exists)
        this.job = {
          ...res,
          role_category: res.role_category || '',
          applied_date: res.applied_date ? new Date(res.applied_date).toISOString().split('T')[0] : '',
          feedback: {
            id: res.feedback.id, // Now assigns the feedback id (may be undefined if no feedback exists)
            notes: res.feedback?.notes || '',
            detailed_feedback: res.feedback?.detailed_feedback || '',
            key_improvements: res.feedback?.key_improvements || '',
            key_strengths: res.feedback?.key_strengths || '',
            category_id: res.feedback?.category_id || null
          }
        };
  
        // Set feedbackSummary from feedback.notes if available
        if (typeof this.job.feedback.notes === 'string') {
          this.job.feedbackSummary = this.job.feedback.notes;
        } else {
          this.job.feedbackSummary = '';
        }
        this.filterCategories();
      },
      error: (err) => this.handleError(err)
    });
  }

  submitForm(): void {
    // Combine short summary + notes if needed
    const combinedNotes = [
      this.job.feedbackSummary,
      this.job.feedback.notes
    ].filter(text => text.trim()).join('\n\n');

    const jobData = { ...this.job };

    // Separate out feedback
    const feedbackData = {
      notes: this.job.feedbackSummary.substring(0, 50),
      category_id: this.job.feedback.category_id,
      detailed_feedback: this.job.feedback.detailed_feedback,
      key_improvements: this.job.status === 'rejected' 
        ? this.job.feedback.key_improvements 
        : '',
      key_strengths: (this.job.status === 'accepted' || this.job.status === 'offer')
        ? this.job.feedback.key_strengths
        : ''
    };
    delete jobData.feedback;

    // Create or Update
    const operation = this.isEditMode
      ? this.jobService.updateJob(this.job.id, jobData)
      : this.jobService.createJob(jobData);

    operation.subscribe({
      next: (res) => {
        const jobId = this.isEditMode ? this.job.id : res.job.id;

        // If we have any feedback, save it
        if (feedbackData.notes.trim() || feedbackData.category_id) {
          this.handleFeedback(jobId, feedbackData);
        } else {
          // Otherwise, just navigate back
          this.router.navigate(['/jobs']);
        }
      },
      error: (err) => this.handleError(err)
    });
  }

  private handleFeedback(jobId: number, feedbackData: any): void {
    console.log("DEBUG: In handleFeedback. Existing feedback id:", this.job.feedback?.id);
    const operation = this.job.feedback?.id
      ? this.jobService.updateFeedback(jobId, feedbackData)
      : this.jobService.createFeedback(jobId, feedbackData);
  
    if (this.job.feedback?.id) {
      console.log("DEBUG: Calling updateFeedback (PUT) for job", jobId, "with data:", feedbackData);
    } else {
      console.log("DEBUG: Calling createFeedback (POST) for job", jobId, "with data:", feedbackData);
    }
  
    operation.subscribe({
      next: () => {
        console.log("DEBUG: Feedback operation successful");
        this.router.navigate(['/jobs']);
      },
      error: (err) => {
        console.error("Feedback save failed", err);
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

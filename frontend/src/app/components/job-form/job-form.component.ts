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

    if (!this.job.status) {
      this.job.status = 'applied';
    }
  }

  private loadFeedbackCategories(): void {
    this.jobService.getFeedbackCategories().subscribe({
      next: (res) => {
        this.feedbackCategories = res;
        //console.log('✅ Loaded Categories:', this.feedbackCategories); // Debugging log
        this.filterCategories(); // Apply filtering after loading categories
      },
      error: (err) => {
        console.error('❌ Failed to load categories:', err);
        this.errorMessage = 'Failed to load feedback categories';
      }
    });
  }
  
  // ✅ Filter categories based on status
  filterCategories(): void {
    //console.log('🔄 Filtering Categories...');
    //console.log('🟡 Current Status:', this.job.status);
  
    if (!this.feedbackCategories || this.feedbackCategories.length === 0) {
      console.warn('⚠️ Categories Not Loaded Yet');
      return;
    }
  
    let allowedTypes: string[] = [];
  
    if (this.job.status === 'offer' || this.job.status === 'accepted') {
      allowedTypes = ['positive', 'neutral'];
    } else if (this.job.status === 'rejected') {
      allowedTypes = ['negative', 'neutral'];
    } else {
      allowedTypes = ['positive', 'negative', 'neutral']; // Show all for applied/interview
    }
  
    //console.log('✅ Allowed Types:', allowedTypes);
  
    this.filteredCategories = this.feedbackCategories.filter(cat => {
      const categoryType = typeof cat.type === 'string' ? cat.type.trim().toLowerCase() : ''; 
      const isAllowed = allowedTypes.includes(categoryType);
      
      //console.log(`Checking Category: ${cat.name} (Type: ${categoryType}) -> ${isAllowed ? '✅ Kept' : '❌ Filtered Out'}`);
      
      return isAllowed;
    });
  
    //console.log('🔽 Final Filtered Categories:', this.filteredCategories);
  }
  
  
  // ✅ Auto-update categories when status changes
  onStatusChange(): void {
    //console.log('🔄 Status Changed BEFORE:', this.job.status);
  
    if (!this.job.status) {
      console.warn('⚠️ Status is Undefined! Setting default.');
      this.job.status = 'applied';
    }
  
    this.filterCategories();
  
    //console.log('✅ Status Changed AFTER:', this.job.status);
    //console.log('🔍 Updated Filtered Categories:', this.filteredCategories);
  }

  private loadJob(jobId: string): void {
    this.jobService.getJobById(+jobId).subscribe({
      next: (res) => {
        console.log("✅ Raw API Response:", res);  // Debugging log
  
        // Ensure proper job structure
        this.job = {
          ...res,
          role_category: res.role_category || '',  // Handle null role_category
          applied_date: res.applied_date ? new Date(res.applied_date).toISOString().split('T')[0] : '',
          feedback: {
            notes: res.feedback?.notes || '',
            detailed_feedback: res.feedback?.detailed_feedback || '',
            key_improvements: res.feedback?.key_improvements || '',
            key_strengths: res.feedback?.key_strengths || '',
            category_id: res.feedback?.category_id || null
          }
        };
  
        // ✅ FIX: Properly assign feedbackSummary
        if (typeof this.job.feedback.notes === 'string') {
          this.job.feedbackSummary = this.job.feedback.notes;
        } else {
          this.job.feedbackSummary = '';
        }
  
        console.log("🛠 Processed Job Data:", this.job);  // Debugging log
        this.filterCategories();
      },
      error: (err) => this.handleError(err)
    });
  }
  
  submitForm(): void {
    // Combine feedback fields with double newline separator

   // console.log('🚀 Submitting Form with Status:', this.job.status);

  if (!this.job.status) {
    console.warn('⚠️ Status is still undefined before submitting!');
    return;
  }
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

      //console.log('📤 Final Job Data:', jobData);
      //console.log('📤 Final Feedback Data:', feedbackData);    
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
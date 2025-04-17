import { Component } from '@angular/core';
import { JobService } from '../../services/job.service';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule, NgForm } from '@angular/forms';
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
  // Initialize job with default values.
  // In your JobFormComponent (job-form.component.ts)
  job: any = {
    job_title: '',
    company: '',
    status: 'applied',
    general_notes: '',
    feedbackSummary: '',
    applied_date: '',
    interview_date: '',
    offer_date: '',
    accepted_date: '',
    rejected_date: '',
    // Initialize role_category as an empty string to force the default option.
    role_category: '',
    feedback: {
      id: undefined,
      notes: '',
      category_id: null,
      detailed_feedback: '',
      priority_improvement: '',
      additional_improvements: [] as string[],
      priority_strength: '',
      additional_strengths: [] as string[]
    }
  };

  feedbackCategories: any[] = [];
  filteredCategories: any[] = [];
  roles: any[] = [];
  statuses = ['applied', 'interview', 'offer', 'accepted', 'rejected'];
  isEditMode = false;
  errorMessage = '';

  // Interview Q&A properties
  showInterviewQASection = false;
  selectedQA: { id?: number; question: string; answer: string }[] = [];
  qaSuggestions: { [index: number]: any[] } = {};
  questionBank: any[] = [];
  usedQuestionIds = new Set<number>();

  // Additional Strengths/Improvements properties
  showAdditionalStrengthInput: boolean = false;
  tempAdditionalStrength: string = '';
  showAdditionalImprovementInput: boolean = false;
  tempAdditionalImprovement: string = '';

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
      this.fetchRecommendedQuestions(+jobId);
      // Load existing Interview Q&A if applicable.
      this.jobService.getInterviewQAs(+jobId).subscribe({
        next: (res) => { this.selectedQA = res; },
        error: (err) => console.error('Failed to load interview questions', err)
      });
      // Load strengths & improvements.
      this.jobService.getFeedbackStrengths(+jobId).subscribe({
        next: (res) => {
          this.job.feedback.priority_strength = res.priority || '';
          this.job.feedback.additional_strengths = res.additional || [];
        },
        error: (err) => console.error('Failed to load feedback strengths', err)
      });
      this.jobService.getFeedbackImprovements(+jobId).subscribe({
        next: (res) => {
          this.job.feedback.priority_improvement = res.priority || '';
          this.job.feedback.additional_improvements = res.additional || [];
        },
        error: (err) => console.error('Failed to load feedback improvements', err)
      });
    } else {
      this.setCurrentUser();
      this.fetchRecommendedQuestions(null);
    }
    if (!this.job.status) {
      this.job.status = 'applied';
    }
  }
  
  private loadFeedbackCategories(): void {
    this.jobService.getFeedbackCategories().subscribe({
      next: (res) => {
        this.feedbackCategories = res;
        this.filterCategories();
      },
      error: (err) => {
        this.errorMessage = 'Failed to load feedback categories';
        console.error(err);
      }
    });
  }

  filterCategories(): void {
    if (!this.feedbackCategories || this.feedbackCategories.length === 0) return;
    let allowedTypes: string[] = [];
    if (this.job.status === 'offer' || this.job.status === 'accepted') {
      allowedTypes = ['positive', 'neutral'];
    } else if (this.job.status === 'rejected') {
      allowedTypes = ['negative', 'neutral'];
    } else {
      allowedTypes = ['positive', 'negative', 'neutral'];
    }
    this.filteredCategories = this.feedbackCategories.filter(cat => {
      const categoryType = (cat.type || '').trim().toLowerCase();
      return allowedTypes.includes(categoryType);
    });
  }

  onStatusChange(): void {
    if (!this.job.status) {
      this.job.status = 'applied';
    }
    this.filterCategories();
    if (this.job && this.job.id) {
      this.fetchRecommendedQuestions(this.job.id);
    }
  }

  private loadJob(jobId: string): void {
    this.jobService.getJobById(+jobId).subscribe({
      next: (res) => {
        this.job = {
          ...res,
          role_category: res.role_category || '',
          applied_date: res.applied_date ? new Date(res.applied_date).toISOString().split('T')[0] : '',
          interview_date: '',
          offer_date: '',
          accepted_date: '',
          rejected_date: '',
          feedback: {
            id: res.feedback ? res.feedback.id : undefined,
            notes: res.feedback?.notes || '',
            detailed_feedback: res.feedback?.detailed_feedback || '',
            priority_improvement: res.feedback?.priority_improvement || '',
            additional_improvements: res.feedback?.additional_improvements || [],
            priority_strength: res.feedback?.priority_strength || '',
            additional_strengths: res.feedback?.additional_strengths || [],
            category_id: res.feedback?.category_id || null
          }
        };

        this.job.feedbackSummary = typeof this.job.feedback.notes === 'string'
          ? this.job.feedback.notes
          : '';
        
        this.filterCategories();
        
        this.jobService.getJobStatusHistory(+jobId).subscribe({
          next: (history) => {
            (history as any[]).forEach((record: any) => {
              const dateStr = record.status_date ? new Date(record.status_date).toISOString().split('T')[0] : '';
              if (record.status === 'interview') {
                this.job.interview_date = dateStr;
              } else if (record.status === 'offer') {
                this.job.offer_date = dateStr;
              } else if (record.status === 'accepted') {
                this.job.accepted_date = dateStr;
              } else if (record.status === 'rejected') {
                this.job.rejected_date = dateStr;
              }
            });
          },
          error: (err) => {
            console.error('Failed to load job status history', err);
          }
        });
      },
      error: (err) => {
        this.errorMessage = 'Failed to load job details';
        console.error(err);
      }
    });
  }

  submitForm(jobForm: NgForm): void {
    if (!jobForm.valid) {
      console.log("Form is invalid. Please fill out required fields.");
      return;
    }
  
    // Prepare the job and feedback data
    const jobData = { ...this.job };
    const feedbackData = {
      notes: this.job.feedbackSummary.substring(0, 50).trim(), // Trim whitespace
      category_id: this.job.feedback.category_id,
      detailed_feedback: this.job.feedback.detailed_feedback.trim(),
      strengths: {
        priority: this.job.feedback.priority_strength.trim(),
        additional: this.job.feedback.additional_strengths.filter((s: string) => s.trim() !== '')
      },
      improvements: {
        priority: this.job.feedback.priority_improvement.trim(),
        additional: this.job.feedback.additional_improvements.filter((s: string) => s.trim() !== '')
      }
    };
  
    // Check if feedback is truly empty
    const isFeedbackEmpty = 
      feedbackData.notes === '' &&
      feedbackData.category_id === null &&
      feedbackData.detailed_feedback === '' &&
      feedbackData.strengths.priority === '' &&
      feedbackData.strengths.additional.length === 0 &&
      feedbackData.improvements.priority === '' &&
      feedbackData.improvements.additional.length === 0;
  
    delete jobData.feedback;
  
    // Rest of date handling remains unchanged...
  
    const operation = this.isEditMode
      ? this.jobService.updateJob(this.job.id, jobData)
      : this.jobService.createJob(jobData);
  
    operation.subscribe({
      next: (res) => {
        const jobId = this.isEditMode ? this.job.id : res.job.id;
        
        if (this.isEditMode && this.job.feedback?.id && isFeedbackEmpty) {
          // Delete existing feedback if it's now empty
          this.jobService.deleteFeedback(jobId).subscribe({
            next: () => console.log('Removed empty feedback'),
            error: (err) => console.error('Failed to remove feedback', err)
          });
        } else if (!isFeedbackEmpty) {
          // Only create/update if feedback has content
          this.handleFeedback(jobId, feedbackData);
        }
  
        if (this.selectedQA.length > 0) {
          this.saveInterviewQAs(jobId);
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
      error: (err) => {
        this.errorMessage += '\nFailed to save feedback details';
        console.error(err);
      }
    });
  }

  private saveInterviewQAs(jobId: number): void {
    this.jobService.saveInterviewQAs(jobId, this.selectedQA).subscribe({
      next: (res) => {
        console.log("Interview Q&A saved successfully", res);
        this.router.navigate(['/jobs']);
      },
      error: (err) => {
        this.errorMessage += '\nFailed to save interview questions';
        console.error(err);
      }
    });
  }

  // Additional Strengths/Improvements Methods
  addAdditionalStrength(): void {
    this.job.feedback.additional_strengths.push('');
  }
  removeAdditionalStrength(index: number): void {
    this.job.feedback.additional_strengths.splice(index, 1);
  }
  addAdditionalImprovement(): void {
    this.job.feedback.additional_improvements.push('');
  }
  removeAdditionalImprovement(index: number): void {
    this.job.feedback.additional_improvements.splice(index, 1);
  }

  // Interview Q&A Methods
  toggleInterviewQA(): void {
    if (!this.showInterviewQASection && this.selectedQA.length === 0) {
      this.addInterviewQA();
    }
    this.showInterviewQASection = !this.showInterviewQASection;
  }
  addInterviewQA(): void {
    this.selectedQA.push({ question: '', answer: '' });
    this.qaSuggestions[this.selectedQA.length - 1] = [];
  }
  removeInterviewQA(index: number): void {
    const removed = this.selectedQA[index];
    if (removed && removed.id) {
      this.usedQuestionIds.delete(removed.id);
    }
    this.selectedQA.splice(index, 1);
    delete this.qaSuggestions[index];
  }
  onQAQuestionInputChange(event: Event, index: number): void {
    const input = event.target as HTMLInputElement;
    const value = input.value || '';
    const query = value.toLowerCase().trim();
    if (!query) {
      this.qaSuggestions[index] = [];
      return;
    }
    this.qaSuggestions[index] = this.questionBank.filter(q =>
      !this.usedQuestionIds.has(q.id) && q.text.toLowerCase().includes(query)
    );
  }
  selectRecommendedQA(suggestion: any, index: number): void {
    if (suggestion.id) {
      this.usedQuestionIds.add(suggestion.id);
    }
    this.selectedQA[index].question = suggestion.text;
    this.qaSuggestions[index] = [];
  }
  fetchRecommendedQuestions(jobId: number | null): void {
    if (jobId === null) {
      this.jobService.getAllRecommendedQuestions().subscribe({
        next: (res) => {
          this.questionBank = res;
        },
        error: (err) => {
          console.error('Failed to fetch recommended questions', err);
        }
      });
    } else {
      this.jobService.getRecommendedQuestions(jobId).subscribe({
        next: (res) => {
          this.questionBank = res;
        },
        error: (err) => {
          console.error('Failed to fetch recommended questions', err);
        }
      });
    }
  }

  // Utility Methods
  private setCurrentUser(): void {
    this.authService.getCurrentUser().subscribe({
      next: (user) => (this.job.user_id = user.id),
      error: (err) => this.handleError(err)
    });
  }
  private handleError(err: any): void {
    this.errorMessage = err.error?.message || 'Operation failed. Please try again.';
    console.error(err);
  }

  // TrackBy Function
  trackByIndex(index: number, item: any): number {
    return index;
  }
}

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
    feedbackSummary: '',
    feedback: {
      id: undefined,         // Track existing feedback if any
      notes: '',
      category_id: null,
      detailed_feedback: '',
      // For improvements:
      priority_improvement: '',
      additional_improvements: [] as string[],
      // For strengths:
      priority_strength: '',
      additional_strengths: [] as string[],
      // If 'rejected', we use improvements. If 'accepted/offer', we use strengths.
      key_improvements: '',  // (Optional leftover if you want a single string approach)
    }
  };

  feedbackCategories: any[] = [];
  filteredCategories: any[] = [];
  roles: any[] = [];
  statuses = ['applied', 'interview', 'offer', 'accepted', 'rejected'];
  isEditMode = false;
  errorMessage = '';

  // ========== Q&A properties ==========
  showInterviewQASection = false;
  selectedQA: { id?: number; question: string; answer: string }[] = [];
  qaSuggestions: { [index: number]: any[] } = {};
  questionBank: any[] = [];
  usedQuestionIds = new Set<number>();

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
    if (!this.job.status) this.job.status = 'applied';
    this.filterCategories();
    if (this.job && this.job.id) {
      this.fetchRecommendedQuestions(this.job.id);
    }
  }

  private loadJob(jobId: string): void {
    this.jobService.getJobById(+jobId).subscribe({
      next: (res) => {
        // Merge loaded job data
        this.job = {
          ...res,
          role_category: res.role_category || '',
          applied_date: res.applied_date ? new Date(res.applied_date).toISOString().split('T')[0] : '',
          feedback: {
            id: res.feedback ? res.feedback.id : undefined,
            notes: res.feedback?.notes || '',
            detailed_feedback: res.feedback?.detailed_feedback || '',
            // If these fields exist on the backend, merge them, else fallback to empty
            priority_improvement: res.feedback?.priority_improvement || '',
            additional_improvements: res.feedback?.additional_improvements || [],
            priority_strength: res.feedback?.priority_strength || '',
            additional_strengths: res.feedback?.additional_strengths || [],
            category_id: res.feedback?.category_id || null
          }
        };

        // Summaries
        this.job.feedbackSummary = typeof this.job.feedback.notes === 'string'
          ? this.job.feedback.notes
          : '';

        this.filterCategories();
      },
      error: (err) => {
        this.errorMessage = 'Failed to load job details';
        console.error(err);
      }
    });
  }

  submitForm(): void {
    // Combine improvements
    const improvementsCombined =
      (this.job.feedback.priority_improvement ? 'Priority: ' + this.job.feedback.priority_improvement + '\n' : '') +
      (this.job.feedback.additional_improvements.length > 0
        ? this.job.feedback.additional_improvements.map((imp: string) => 'Additional: ' + imp).join('\n')
        : '');

    // Combine strengths
    const strengthsCombined =
      (this.job.feedback.priority_strength ? 'Priority: ' + this.job.feedback.priority_strength + '\n' : '') +
      (this.job.feedback.additional_strengths.length > 0
        ? this.job.feedback.additional_strengths.map((str: string) => 'Additional: ' + str).join('\n')
        : '');

    // Build the final key_strengths or key_improvements field
    // For "rejected" we might want improvements. For "accepted/offer" we might want strengths.
    // But if you want to unify them into a single field like "key_strengths" on the backend, we can do:
    let finalKeyStrengths = '';
    let finalKeyImprovements = '';
    if (this.job.status === 'rejected') {
      // Put improvements into key_improvements
      finalKeyImprovements = improvementsCombined;
    } else if (this.job.status === 'accepted' || this.job.status === 'offer') {
      // Put strengths into key_strengths
      finalKeyStrengths = strengthsCombined;
    }

    const jobData = { ...this.job };

    // Build feedback data
    const feedbackData = {
      notes: this.job.feedbackSummary.substring(0, 50),
      category_id: this.job.feedback.category_id,
      detailed_feedback: this.job.feedback.detailed_feedback,
      key_improvements: finalKeyImprovements,
      key_strengths: finalKeyStrengths
    };

    // Remove the feedback object from jobData so we don't send it directly
    delete jobData.feedback;

    // Create or update job
    const operation = this.isEditMode
      ? this.jobService.updateJob(this.job.id, jobData)
      : this.jobService.createJob(jobData);

    operation.subscribe({
      next: (res) => {
        const jobId = this.isEditMode ? this.job.id : res.job.id;
        if (feedbackData.notes.trim() || feedbackData.category_id) {
          this.handleFeedback(jobId, feedbackData);
        } else {
          // Possibly handle Q&A saving here, then navigate
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
      next: () => {
        // Possibly handle Q&A saving here
        this.router.navigate(['/jobs']);
      },
      error: (err) => {
        this.errorMessage += '\nFailed to save feedback details';
        console.error(err);
      }
    });
  }

  // ====================== Additional Strengths & Improvements ======================

  // For improvements:
  addAdditionalImprovement(): void {
    this.job.feedback.additional_improvements.push('');
  }
  removeAdditionalImprovement(index: number): void {
    this.job.feedback.additional_improvements.splice(index, 1);
  }

  // For strengths:
  addAdditionalStrength(): void {
    this.job.feedback.additional_strengths.push('');
  }
  removeAdditionalStrength(index: number): void {
    this.job.feedback.additional_strengths.splice(index, 1);
  }

  // ====================== Interview Q&A Methods ======================

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

  // ====================== Utility Methods ======================

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
}
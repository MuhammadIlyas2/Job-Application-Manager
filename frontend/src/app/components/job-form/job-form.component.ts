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
  // Main job properties
  job: any = {
    job_title: '',
    company: '',
    status: 'applied',
    general_notes: '',
    feedbackSummary: '',
    feedback: {
      id: undefined,
      notes: '',
      category_id: null,
      detailed_feedback: '',
      key_improvements: '',
      key_strengths: ''
    }
  };

  feedbackCategories: any[] = [];
  filteredCategories: any[] = [];
  roles: any[] = [];
  statuses = ['applied', 'interview', 'offer', 'accepted', 'rejected'];
  isEditMode = false;
  errorMessage = '';

  // ---------------- Interview Q&A properties ----------------
  showInterviewQASection = false;
  // Q&A array. Each entry: { id?: number, question: string, answer: string }
  selectedQA: { id?: number; question: string; answer: string }[] = [];
  // Autocomplete suggestions per Q&A index
  qaSuggestions: { [index: number]: any[] } = {};
  // Full recommended questions from backend
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
      // For new jobs, fetch all recommended questions
      this.fetchRecommendedQuestions(null);
    }

    if (!this.job.status) {
      this.job.status = 'applied';
    }
  }

  private loadFeedbackCategories(): void {
    this.jobService.getFeedbackCategories().subscribe({
      next: (res) => {
        console.log("DEBUG: Loaded feedback categories:", res);
        this.feedbackCategories = res;
        this.filterCategories();
      },
      error: (err) => {
        console.error('Failed to load categories:', err);
        this.errorMessage = 'Failed to load feedback categories';
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

    // If we already have a jobId, we can re-fetch recommended Q's
    if (this.job && this.job.id) {
      console.log("DEBUG: onStatusChange -> jobId:", this.job.id);
      this.fetchRecommendedQuestions(this.job.id);
    }
  }

  private loadJob(jobId: string): void {
    this.jobService.getJobById(+jobId).subscribe({
      next: (res) => {
        console.log("DEBUG: Loaded job:", res);
        this.isEditMode = true;

        this.job = {
          ...res,
          role_category: res.role_category || '',
          applied_date: res.applied_date ? new Date(res.applied_date).toISOString().split('T')[0] : '',
          feedback: {
            id: res.feedback?.id,
            notes: res.feedback?.notes || '',
            detailed_feedback: res.feedback?.detailed_feedback || '',
            key_improvements: res.feedback?.key_improvements || '',
            key_strengths: res.feedback?.key_strengths || '',
            category_id: res.feedback?.category_id || null
          }
        };

        // Initialize feedbackSummary from notes
        this.job.feedbackSummary = typeof this.job.feedback.notes === 'string'
          ? this.job.feedback.notes
          : '';

        this.filterCategories();
      },
      error: (err) => this.handleError(err)
    });
  }

  submitForm(): void {
    const combinedNotes = [
      this.job.feedbackSummary,
      this.job.feedback.notes
    ].filter(text => text.trim()).join('\n\n');

    const jobData = { ...this.job };
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

    // Remove feedback from jobData to avoid confusion in the final object
    delete jobData.feedback;

    const operation = this.isEditMode
      ? this.jobService.updateJob(this.job.id, jobData)
      : this.jobService.createJob(jobData);

    operation.subscribe({
      next: (res) => {
        const jobId = this.isEditMode ? this.job.id : res.job.id;
        // If we have any feedback details, save them
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
    console.log("DEBUG: In handleFeedback. feedbackId:", this.job.feedback?.id);

    const operation = this.job.feedback?.id
      ? this.jobService.updateFeedback(jobId, feedbackData)
      : this.jobService.createFeedback(jobId, feedbackData);

    operation.subscribe({
      next: () => {
        console.log("DEBUG: Feedback operation successful");
        // Optionally, save Q&A items here if you have a specific backend endpoint
        this.router.navigate(['/jobs']);
      },
      error: (err) => {
        console.error("DEBUG: Feedback save failed", err);
        this.errorMessage += '\nFailed to save feedback details';
      }
    });
  }

  // ---------------- Interview Q&A Methods ----------------

  /**
   * Toggles the Interview Q&A section. If user is opening it the first time
   * and there are no Q&A items yet, automatically add the first item.
   */
  toggleInterviewQA(): void {
    if (!this.showInterviewQASection && this.selectedQA.length === 0) {
      this.addInterviewQA();
    }
    this.showInterviewQASection = !this.showInterviewQASection;
  }

  /** Adds a blank Q&A entry. */
  addInterviewQA(): void {
    this.selectedQA.push({ question: '', answer: '' });
    // Initialize an empty array for suggestions for this new index
    this.qaSuggestions[this.selectedQA.length - 1] = [];
  }

  /** Removes the Q&A entry at a specific index. */
  removeInterviewQA(index: number): void {
    const removedItem = this.selectedQA[index];
    // If the removed item has a recommended question ID, free it up
    if (removedItem?.id) {
      this.usedQuestionIds.delete(removedItem.id);
    }
    // Remove from array
    this.selectedQA.splice(index, 1);
    // Remove from suggestions map
    delete this.qaSuggestions[index];
  }

  /**
   * Called when user types in the question input for Q&A item at `index`.
   * We'll parse the input event, filter questionBank, and populate suggestions.
   */
  onQAQuestionInputChange(event: Event, index: number): void {
    const inputEl = event.target as HTMLInputElement;
    const value = inputEl.value || '';
    const query = value.toLowerCase().trim();

    if (!query) {
      this.qaSuggestions[index] = [];
      return;
    }

    // Filter out used recommended questions
    this.qaSuggestions[index] = this.questionBank.filter(q =>
      !this.usedQuestionIds.has(q.id) && q.text.toLowerCase().includes(query)
    );
  }

  /**
   * Called when user clicks on a recommended question from the suggestions
   * for Q&A item at `index`.
   */
  selectRecommendedQA(suggestion: any, index: number): void {
    // Mark this question as used
    if (suggestion.id) {
      this.usedQuestionIds.add(suggestion.id);
    }
    // Assign question text to the Q&A item
    this.selectedQA[index].question = suggestion.text;
    // Clear suggestions
    this.qaSuggestions[index] = [];
  }

  /**
   * Fetch recommended questions from the backend. If jobId is null, fetch all.
   */
  fetchRecommendedQuestions(jobId: number | null): void {
    if (jobId === null) {
      console.log("DEBUG: jobId is null -> fetching all recommended questions");
      this.jobService.getAllRecommendedQuestions().subscribe({
        next: (res) => {
          console.log("DEBUG: All recommended questions:", res);
          this.questionBank = res;
        },
        error: (err) => {
          console.error("DEBUG: Error fetching all recommended questions:", err);
        }
      });
    } else {
      console.log("DEBUG: jobId =", jobId, "-> fetching recommended questions");
      this.jobService.getRecommendedQuestions(jobId).subscribe({
        next: (res) => {
          console.log("DEBUG: Recommended questions from backend:", res);
          this.questionBank = res;
        },
        error: (err) => {
          console.error("DEBUG: Error fetching recommended questions:", err);
        }
      });
    }
  }

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

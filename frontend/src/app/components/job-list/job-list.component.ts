import { Component } from '@angular/core';
import { JobService } from '../../services/job.service';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { StatusPillComponent } from '../status-pill/status-pill.component';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

@Component({
  selector: 'app-job-list',
  standalone: true,
  imports: [CommonModule, StatusPillComponent, RouterLink],
  templateUrl: './job-list.component.html',
  styleUrl: './job-list.component.css'
})
export class JobListComponent {
  jobs: any[] = [];
  errorMessage = '';
  currentPage = 1;
  totalPages = 1;
  jobsPerPage = window.innerWidth < 768 ? 1 : 2; // Show 1 job per page on small screens, 2 on large screens
  EXCEL_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8';

  constructor(private jobService: JobService, private router: Router) {}

  ngOnInit(): void {
    this.loadJobs();
  }

  // 🔹 Load Jobs with Pagination
  loadJobs(): void {
    this.jobService.getJobs(this.currentPage, this.jobsPerPage).subscribe(
      res => {
        console.log("✅ API Response:", res); // Debug log
        this.jobs = Array.isArray(res) ? res : res.jobs; // Handle both array and object responses
        this.totalPages = res.totalPages || 1; // Default to 1 if not available
      },
      err => {
        console.error("❌ Error Fetching Jobs:", err);
        this.errorMessage = 'Error loading jobs';
      }
    );
  }

  // 🔹 Navigate to Specific Page
  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.loadJobs();
    }
  }

  // 🔹 Pagination Controls
  prevPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.loadJobs();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.loadJobs();
    }
  }

  // 🔹 Navigate to Job Details (Prevent Click Propagation)
  goToJobDetails(jobId: number, event: Event): void {
    event.stopPropagation(); // Prevent row click from triggering
    this.router.navigate([`/jobs/${jobId}`]);
  }

  // 🔹 Delete Job (Prevent Click Propagation)
  deleteJob(jobId: number, event: Event): void {
    event.stopPropagation(); // Prevent row click
    if (confirm('Are you sure you want to delete this job?')) {
      this.jobService.deleteJob(jobId).subscribe(() => this.loadJobs());
    }
  }

  editJob(jobId: number, event: Event): void {
    event.stopPropagation();
    this.router.navigate([`/job-form/${jobId}`])
  }

  exportToExcel(): void {
    if (this.jobs.length === 0) {
      alert("No jobs available to export!");
      return;
    }
  
    // ✅ Convert Job Data into an Excel-compatible format
    const jobData = this.jobs.map(job => ({
      "Job Title": job.job_title,
      "Company": job.company,
      "Role Category": job.role_category || "N/A",
      "Status": job.status,
      "Feedback": job.feedback || "No feedback",
      "Applied Date": job.applied_date ? new Date(job.applied_date).toLocaleDateString() : "N/A"
    }));
  
    // ✅ Create a new worksheet & workbook
    const worksheet = XLSX.utils.json_to_sheet(jobData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Job Applications");
  
    // ✅ Save the file
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const data = new Blob([excelBuffer], { type: this.EXCEL_TYPE });
  
    saveAs(data, `Job_Applications_${new Date().toISOString().split('T')[0]}.xlsx`);
  }

}
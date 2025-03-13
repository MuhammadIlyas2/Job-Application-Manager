import { Component, HostListener, OnInit, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
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
  styleUrls: ['./job-list.component.css']
})
export class JobListComponent implements OnInit, AfterViewInit {
  jobs: any[] = [];
  errorMessage = '';
  currentPage = 1;
  totalPages = 1;
  jobsPerPage: number = 5;

  @ViewChild('tableContainer') tableContainer!: ElementRef;

  constructor(private jobService: JobService, private router: Router) {}

  ngOnInit(): void {
    this.calculateJobsPerPage();
    this.loadJobs();
  }

  ngAfterViewInit(): void {
    // Slight delay to ensure the container is rendered
    setTimeout(() => {
      this.calculateJobsPerPage();
      this.loadJobs();
    }, 100);
  }

  @HostListener('window:resize', ['$event'])
  onResize(): void {
    this.calculateJobsPerPage();
    setTimeout(() => this.loadJobs(), 200);
  }

  calculateJobsPerPage(): void {
    if (this.tableContainer?.nativeElement) {
      const container = this.tableContainer.nativeElement;
      const rowHeight = 70;
      // Adjust for any header/footer space
      const availableHeight =
        window.innerHeight - container.getBoundingClientRect().top - 100;
      this.jobsPerPage = Math.max(2, Math.floor(availableHeight / rowHeight));
    } else {
      // Fallback if container is not ready
      this.jobsPerPage = window.innerWidth < 768 ? 3 : 6;
    }
  }

  loadJobs(): void {
    this.jobService.getJobs(this.currentPage, this.jobsPerPage).subscribe(
      (res: any) => {
        this.jobs = res.jobs;
        this.totalPages = res.totalPages;
        this.currentPage = res.currentPage;
      },
      err => {
        this.errorMessage = 'Error loading jobs';
      }
    );
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.loadJobs();
    }
  }

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

  goToJobDetails(jobId: number, event: Event): void {
    event.stopPropagation();
    this.router.navigate([`/jobs/${jobId}`]);
  }

  deleteJob(jobId: number, event: Event): void {
    event.stopPropagation();
    if (confirm('Are you sure you want to delete this job?')) {
      this.jobService.deleteJob(jobId).subscribe(() => this.loadJobs());
    }
  }

  editJob(jobId: number, event: Event): void {
    event.stopPropagation();
    this.router.navigate([`/job-form/${jobId}`]);
  }

  exportToExcel(): void {
    if (this.jobs.length === 0) {
      alert("No jobs available to export!");
      return;
    }

    const jobData = this.jobs.map(job => ({
      "Job Title": job.job_title,
      "Company": job.company,
      "Role Category": job.role_category || "N/A",
      "Status": job.status,
      "Feedback": job.feedback || "No feedback",
      "Applied Date": job.applied_date
        ? new Date(job.applied_date).toLocaleDateString()
        : "N/A"
    }));

    const worksheet = XLSX.utils.json_to_sheet(jobData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Job Applications");

    const excelBuffer = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'array'
    });
    const data = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8'
    });

    saveAs(data, `Job_Applications_${new Date().toISOString().split('T')[0]}.xlsx`);
  }

  getPageNumbers(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }
}

import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class JobService {
  private baseUrl = 'http://localhost:5000/api/jobs';

  constructor(private http: HttpClient, private authService: AuthService, private router: Router) {}

  private getAuthHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({ 'Authorization': `Bearer ${token}` });
  }

  // Fetch Jobs with Pagination
  getJobs(page: number = 1, limit: number = 5): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.get(`${this.baseUrl}?page=${page}&limit=${limit}`, { headers });
  }

  // Get Job Details
  getJobById(jobId: number): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.get<any>(`${this.baseUrl}/${jobId}`, { headers });
  }

  // Create a New Job
  createJob(jobData: any): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.post<any>(`${this.baseUrl}`, jobData, { headers });
  }

  // Update Job
  updateJob(jobId: number, jobData: any): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.put<any>(`${this.baseUrl}/${jobId}`, jobData, { headers });
  }

  // Delete Job
  deleteJob(jobId: number): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.delete<any>(`${this.baseUrl}/jobs/${jobId}`, { headers });
  }

  // Create Feedback
  createFeedback(jobId: number, feedback: any): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.post<any>(`${this.baseUrl}/jobs/${jobId}/feedback`, feedback, { headers });
  }
  
  // Update Feedback
  updateFeedback(jobId: number, feedback: any): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.put<any>(`${this.baseUrl}/jobs/${jobId}/feedback`, feedback, { headers });
  }

  // Get Feedback Categories
  getFeedbackCategories(): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.get<any>(`${this.baseUrl}/feedback-categories`, { headers });
  }

  // Get Recommended Questions for a Job
  getRecommendedQuestions(jobId: number): Observable<any> {
    const headers = this.getAuthHeaders();
    console.log("DEBUG: Calling GET recommended questions for jobId:", jobId);
    return this.http.get<any>(`${this.baseUrl}/${jobId}/recommended-questions`, { headers });
  }

  // Get All Recommended Questions
  getAllRecommendedQuestions(): Observable<any> {
    const headers = this.getAuthHeaders();
    console.log("DEBUG: Calling GET all recommended questions");
    return this.http.get<any>(`${this.baseUrl}/recommended-questions`, { headers });
  }

  // Get Interview Q&A for a Job
  getInterviewQAs(jobId: number): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.get<any>(`${this.baseUrl}/${jobId}/interview-questions`, { headers });
  }
  
  // Save Interview Q&A for a Job
  saveInterviewQAs(jobId: number, interviewQAs: any[]): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.post<any>(`${this.baseUrl}/${jobId}/interview-questions`, interviewQAs, { headers });
  }

  // Get Feedback Strengths for a Job
  getFeedbackStrengths(jobId: number): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.get<any>(`${this.baseUrl}/${jobId}/feedback/strengths`, { headers });
  }
  
  // Get Feedback Improvements for a Job
  getFeedbackImprovements(jobId: number): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.get<any>(`${this.baseUrl}/${jobId}/feedback/improvements`, { headers });
  }

  getJobStatusHistory(jobId: number): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.get<any>(`${this.baseUrl}/${jobId}/status-history`, { headers });
  }
}

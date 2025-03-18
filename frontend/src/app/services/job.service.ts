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

  // 🔹 Fetch Jobs with Pagination
  getJobs(page: number = 1, limit: number = 5): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.get(`${this.baseUrl}?page=${page}&limit=${limit}`, { headers });
  }

  // 🔹 Get Job Details
  getJobById(jobId: number): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.get<any>(`${this.baseUrl}/${jobId}`, { headers });
  }

  // 🔹 Create a New Job
  createJob(jobData: any): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.post<any>(`${this.baseUrl}`, jobData, { headers });
  }

  // 🔹 Update Job
  updateJob(jobId: number, jobData: any): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.put<any>(`${this.baseUrl}/${jobId}`, jobData, { headers });
  }

  // 🔹 Delete Job
  deleteJob(jobId: number): Observable<any> {
    const headers = this.getAuthHeaders();
    // Add /jobs to match the backend route structure
    return this.http.delete<any>(`${this.baseUrl}/jobs/${jobId}`, { headers });
  }

  createFeedback(jobId: number, feedback: any): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.post<any>(`${this.baseUrl}/jobs/${jobId}/feedback`, feedback, { headers });
  }
  
  updateFeedback(jobId: number, feedback: any): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.put<any>(`${this.baseUrl}/jobs/${jobId}/feedback`, feedback, { headers });
  }

  getFeedbackCategories(): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.get<any>(`${this.baseUrl}/feedback-categories`, { headers });
  }

  getRecommendedQuestions(jobId: number): Observable<any> {
    const headers = this.getAuthHeaders();
    console.log("DEBUG: Calling GET recommended questions for jobId:", jobId);
    return this.http.get<any>(`${this.baseUrl}/${jobId}/recommended-questions`, { headers });
  }

  getAllRecommendedQuestions(): Observable<any> {
    const headers = this.getAuthHeaders();
    console.log("DEBUG: Calling GET all recommended questions");
    return this.http.get<any>(`${this.baseUrl}/recommended-questions`, { headers });
  }

  getInterviewQAs(jobId: number): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.get<any>(`${this.baseUrl}/${jobId}/interview-questions`, { headers });
  }
  
  saveInterviewQAs(jobId: number, interviewQAs: any[]): Observable<any> {
    const headers = this.getAuthHeaders();
    // Send the interview QAs array in the request body
    return this.http.post<any>(`${this.baseUrl}/${jobId}/interview-questions`, interviewQAs, { headers });
  }

  getFeedbackStrengths(jobId: number): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.get<any>(`${this.baseUrl}/${jobId}/feedback/strengths`, { headers });
  }
  
  getFeedbackImprovements(jobId: number): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.get<any>(`${this.baseUrl}/${jobId}/feedback/improvements`, { headers });
  }
  
}

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

  getJobs(
    page: number = 1,
    limit: number = 5,
    filters?: { searchText?: string; status?: string; sortBy?: string; sortOrder?: string }
  ): Observable<any> {
    const headers = this.getAuthHeaders();
    let params = `?page=${page}&limit=${limit}`;
    if (filters) {
      if (filters.searchText) {
        params += `&search=${encodeURIComponent(filters.searchText)}`;
      }
      if (filters.status) {
        params += `&status=${encodeURIComponent(filters.status)}`;
      }
      if (filters.sortBy) {
        params += `&sort_by=${encodeURIComponent(filters.sortBy)}`;
      }
      if (filters.sortOrder) {
        params += `&sort_order=${encodeURIComponent(filters.sortOrder)}`;
      }
    }
    return this.http.get(`${this.baseUrl}${params}`, { headers });
  }


  getJobById(jobId: number): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.get<any>(`${this.baseUrl}/${jobId}`, { headers });
  }

  createJob(jobData: any): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.post<any>(`${this.baseUrl}`, jobData, { headers });
  }

  updateJob(jobId: number, jobData: any): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.put<any>(`${this.baseUrl}/${jobId}`, jobData, { headers });
  }

  deleteJob(jobId: number): Observable<any> {
    const headers = this.getAuthHeaders();
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
    return this.http.get<any>(`${this.baseUrl}/${jobId}/recommended-questions`, { headers });
  }

  getAllRecommendedQuestions(): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.get<any>(`${this.baseUrl}/recommended-questions`, { headers });
  }

  getInterviewQAs(jobId: number): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.get<any>(`${this.baseUrl}/${jobId}/interview-questions`, { headers });
  }
  
  saveInterviewQAs(jobId: number, interviewQAs: any[]): Observable<any> {
    const headers = this.getAuthHeaders();
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

  getJobStatusHistory(jobId: number): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.get<any>(`${this.baseUrl}/${jobId}/status-history`, { headers });
  }

  deleteFeedback(jobId: number): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.delete<any>(
      `${this.baseUrl}/${jobId}/feedback`,
      { headers }
    );
  }
}

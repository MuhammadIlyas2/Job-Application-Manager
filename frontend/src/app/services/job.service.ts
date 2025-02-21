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
    return this.http.post<any>(this.baseUrl, jobData, { headers });
  }

  // 🔹 Update Job
  updateJob(jobId: number, jobData: any): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.put<any>(`${this.baseUrl}/${jobId}`, jobData, { headers });
  }

  // 🔹 Delete Job
  deleteJob(jobId: number): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.delete<any>(`${this.baseUrl}/${jobId}`, { headers });
  }
}

import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class JobService {
  private baseUrl = 'http://localhost:5000/api/jobs';

  constructor(private http: HttpClient, private authService: AuthService, private router: Router) { }

  private getAuthHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({ 'Authorization': `Bearer ${token}` });
  }

  getJobs(userId?: number): Observable<any> {
    const headers = this.getAuthHeaders();
    withCredentials: true
    return this.http.get(`${this.baseUrl}`, { headers });
  }

  getJobById(jobId: number): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.get(`${this.baseUrl}/${jobId}`, { headers });
  }

  createJob(jobData: any): Observable<any> {
    const headers = this.getAuthHeaders();
    withCredentials: true
    return this.http.post(`${this.baseUrl}`, jobData, { headers });
  }

  updateJob(jobId: number, jobData: any): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.put(`${this.baseUrl}/${jobId}`, jobData, { headers });
  }

  deleteJob(jobId: number): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.delete(`${this.baseUrl}/${jobId}`, { headers });
  }

  private handleAuthError(error: HttpErrorResponse): Observable<never> {
    if (error.status === 401) {  // 🔹 Token expired or unauthorized
      console.error("🔴 Token expired or unauthorized. Redirecting to login...");
      this.authService.logout();  // 🔹 Remove invalid token
      this.router.navigate(['/login']);  // 🔹 Redirect to login
    }
    return throwError(error);  // 🔹 Return error for further handling if needed
  }
}

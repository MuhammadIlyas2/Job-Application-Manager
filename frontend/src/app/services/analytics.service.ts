import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';  // Inject AuthService

@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {
  private baseUrl = 'http://localhost:5000/api/analytics';

  constructor(private http: HttpClient, private authService: AuthService) { }

  private getAuthHeaders(): HttpHeaders {
    const token = this.authService.getToken(); // Use AuthService for token retrieval
    return new HttpHeaders({ 'Authorization': `Bearer ${token}` });
  }

  getOverview(): Observable<any> {
    return this.http.get(`${this.baseUrl}/dashboard`, { headers: this.getAuthHeaders() });
  }

  getStatusTrends(): Observable<any> {
    return this.http.get(`${this.baseUrl}/status-trends`, { headers: this.getAuthHeaders() });
  }

  // Updated to accept optional query parameters
  getFeedbackInsights(params?: any): Observable<any> {
    const headers = this.getAuthHeaders();
    let queryParams = "";
    if (params) {
      const keys = Object.keys(params);
      if (keys.length > 0) {
        queryParams = "?" + keys
          .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`)
          .join("&");
      }
    }
    return this.http.get(`${this.baseUrl}/feedback-insights${queryParams}`, { headers });
  }

  getFeedbackInsightsByRole(role?: string): Observable<any> {
    const headers = this.getAuthHeaders();
    let params = new HttpParams();
    if (role) {
      params = params.set('role', role);
    }
    return this.http.get(
      `${this.baseUrl}/feedback-insights`,
      { headers, params }
    );
  }

  getAvailableRoles(): Observable<string[]> {
    const headers = this.getAuthHeaders();
    return this.http.get<string[]>(
      `${this.baseUrl}/available-roles`,
      { headers }
    );
  }
}

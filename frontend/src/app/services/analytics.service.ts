import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {
  private baseUrl = 'http://localhost:5000/api/analytics';

  constructor(private http: HttpClient, private authService: AuthService) { }

  private getAuthHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({ 'Authorization': `Bearer ${token}` });
  }

  getOverview(): Observable<any> {
    return this.http.get(`${this.baseUrl}/dashboard`, { headers: this.getAuthHeaders() });
  }

  getStatusTrends(): Observable<any> {
    return this.http.get(`${this.baseUrl}/status-trends`, { headers: this.getAuthHeaders() });
  }

  getFeedbackInsights(): Observable<any> {
    return this.http.get(`${this.baseUrl}/feedback-insights`, { headers: this.getAuthHeaders() });
  }
}

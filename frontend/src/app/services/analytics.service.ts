import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {
  private baseUrl = 'http://localhost:5000/api/analytics';

  constructor(private http: HttpClient) { }

  getRoleAnalytics(role: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/role/${role}`);
  }
}

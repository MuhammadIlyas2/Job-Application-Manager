import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private baseUrl = 'http://localhost:5000/api/auth';

  constructor(private http: HttpClient) { }

  login(credentials: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/login`, credentials).pipe(
      tap((res: any) => {
        if (res.token) {
          this.saveToken(res.token);
        }
      })
    );
  }

  signup(userData: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/signup`, userData);
  }

  saveToken(token: string): void {
    localStorage.setItem('token', token);  // ✅ Always save the latest token
  }

  getToken(): string | null {
    return localStorage.getItem('token');  // ✅ Retrieve the latest token
  }

  isAuthenticated(): boolean {
    return !!this.getToken();  // ✅ Returns true if token exists
  }

  getCurrentUser(): Observable<any> {
    const headers = new HttpHeaders({ 'Authorization': `Bearer ${this.getToken()}` });
    return this.http.get(`${this.baseUrl}/current-user`, { headers });
  }

  logout(): void {
    localStorage.removeItem('token');
  }
}

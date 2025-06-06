import { Routes } from '@angular/router';
import { JobListComponent } from './components/job-list/job-list.component';
import { JobFormComponent } from './components/job-form/job-form.component';
import { JobDetailsComponent } from './components/job-details/job-details.component';
import { AnalyticsDashboardComponent } from './components/analytics-dashboard/analytics-dashboard.component';
import { LoginSignupComponent } from './components/login-signup/login-signup.component';
import { FeedbackInsightsComponent } from './components/feedback-insights/feedback-insights.component';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginSignupComponent },
  { path: 'jobs', component: JobListComponent },
  { path: 'jobs/:id', component: JobDetailsComponent },
  { path: 'job-form', component: JobFormComponent },
  { path: 'job-form/:id', component: JobFormComponent },
  { path: 'analytics', component: AnalyticsDashboardComponent },
  { path: 'insights', component: FeedbackInsightsComponent } 
];
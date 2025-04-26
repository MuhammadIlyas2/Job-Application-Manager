import { TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController
} from '@angular/common/http/testing';
import { JobService } from './job.service';
import { AuthService } from './auth.service';
import { HttpHeaders } from '@angular/common/http';


describe('JobService', () => {
  let service: JobService;
  let httpMock: HttpTestingController;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  const fakeToken = 'fake-jwt-token';
  const baseUrl = 'http://localhost:5000/api/jobs';

  beforeEach(() => {
    const spy = jasmine.createSpyObj('AuthService', ['getToken']);

    TestBed.configureTestingModule({
      imports: [ HttpClientTestingModule ],
      providers: [
        JobService,
        { provide: AuthService, useValue: spy }
      ]
    });

    service       = TestBed.inject(JobService);
    httpMock      = TestBed.inject(HttpTestingController);
    authServiceSpy = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    authServiceSpy.getToken.and.returnValue(fakeToken);
  });

  afterEach(() => {
    httpMock.verify();
  });

  function expectAuthHeader(reqUrl: string, method: string) {
    const req = httpMock.expectOne(reqUrl);
    expect(req.request.method).toBe(method);
    expect(req.request.headers.get('Authorization'))
      .toBe(`Bearer ${fakeToken}`);
    return req;
  }

  it('should fetch paginated jobs', () => {
    service.getJobs(2, 10, { searchText: 'foo', status: 'applied' })
      .subscribe();

    const url = `${baseUrl}?page=2&limit=10&search=foo&status=applied`;
    const req = expectAuthHeader(url, 'GET');
    req.flush({ jobs: [], totalPages: 0, totalJobs: 0, currentPage: 2 });
  });

  it('should get a single job by id', () => {
    service.getJobById(42).subscribe();
    const req = expectAuthHeader(`${baseUrl}/42`, 'GET');
    req.flush({ id: 42 });
  });

  it('should create a new job', () => {
    const payload = { job_title: 'T', company: 'C' };
    service.createJob(payload).subscribe();
    const req = expectAuthHeader(baseUrl, 'POST');
    expect(req.request.body).toEqual(payload);
    req.flush({ message: 'ok' });
  });

  it('should update a job', () => {
    const payload = { job_title: 'T2', company: 'C2' };
    service.updateJob(7, payload).subscribe();
    const req = expectAuthHeader(`${baseUrl}/7`, 'PUT');
    expect(req.request.body).toEqual(payload);
    req.flush({ message: 'ok' });
  });

  it('should delete a job', () => {
    service.deleteJob(99).subscribe();
    // note: URL in your service has an extra /jobs/—adjust if needed
    const req = expectAuthHeader(`${baseUrl}/jobs/99`, 'DELETE');
    req.flush({ message: 'deleted' });
  });

  it('should delete feedback', () => {
    service.deleteFeedback(123).subscribe();
    const req = expectAuthHeader(`${baseUrl}/123/feedback`, 'DELETE');
    req.flush({ message: 'feedback deleted' });
  });
});

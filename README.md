# Job Application Manager

A full-stack single-page web application to manage job applications, employer feedback, and personal analytics. Built with Angular (frontend), Flask (backend), and MySQL (database).

---

## ✨ Features

- **Track Applications**: Add, edit, and delete job applications with fields like job title, company, status, and applied date.
- **Analytics Dashboard**: Visualize application statistics (status breakdown, trends over time).
- **Feedback Insights**: Record and analyse employer feedback with visual summaries of strengths and weaknesses.
- **CSV Export**: Export your full application and feedback data.
- **JWT Authentication**: Secure login and registration with token-based access.
- **Mobile-Responsive**: Works across devices.

---

## 🎓 Technologies Used

| Layer       | Stack                         |
|-------------|-------------------------------|
| Front-End   | Angular 17, Chart.js, HTML/CSS |
| Back-End    | Flask, Flask-JWT-Extended     |
| Database    | MySQL, SQLAlchemy             |
| Testing     | PyTest, Jasmine/Karma, Postman|
| DevOps      | GitHub Actions                |

---

## 📆 Project Setup

### ⚡ Backend (Flask)

```bash
cd backend
python -m venv venv
venv\Scripts\activate (Windows) or source venv/bin/activate (Unix)
pip install -r requirements.txt
python app.py
```

Ensure your MySQL DB is configured (see `app.py` and `.env` for DB settings).

---

### 🌐 Frontend (Angular)

```bash
cd frontend
npm install
ng serve
```

App will run on `http://localhost:4200`

---

## 🔧 Testing

### 🔢 API Testing (PyTest)
```bash
cd backend
pytest tests --cov=app --cov-report=term
```
Covers 20 endpoints with ~90% coverage.

### 🛠️ Front-End Testing (Jasmine / Karma)
```bash
cd frontend
ng test
```

### 🎓 Postman Load Test
Use the `postman/` folder collection and run using Collection Runner with 100 iterations.

---

## 🔧 Database Schema

```sql
Tables:
- user
- job_application
- job_status_history
- feedback
- feedback_strength
- feedback_improvement
- feedback_category
- question_bank
```

---

## 🚀 Sample Credentials

```json
{
  "username_or_email": "testuser",
  "password": "P@ssw0rd"
}
```

---

## 🔍 Key Highlights

- Visualise real hiring trends in your own search.
- Learn from prior feedback to improve future interviews.
- Lightweight, fast and fully open-source.

---

## 🌟 Author
**Muhammad Ilyas**
- [GitHub Profile](https://github.com/MuhammadIlyas2)

---

## 📖 Related Files

- [Performance Report (PDF)](./Job-Application-Manager-Performance-Test-performance-report-5.pdf)
- [User Feedback CSV](./Job%20Application%20Manager%20User%20Feedback%20.csv)

---

_This project was submitted as part of the Level 6 Development Project (55-608850) module at Sheffield Hallam University._

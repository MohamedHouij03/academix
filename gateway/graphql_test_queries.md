# Academix GraphQL Testing Guide & Queries (JSON Format)

This document provides a complete set of GraphQL test queries and mutations formatted as JSON payloads for testing the Academix API Gateway (`http://localhost:3000/graphql`).

Each operation includes the standard GraphQL syntax, the raw JSON payload format, and example `curl` commands.

---

## 🚀 Endpoint Details
- **GraphQL Endpoint:** `POST http://localhost:3000/graphql`
- **Headers:** `Content-Type: application/json`

---

## 🔍 Queries

### 1. Retrieve Course Details (`course`)
Fetches specific details of a course by its unique ID.

**GraphQL Syntax:**
```graphql
query GetCourse {
  course(id: "7ef54c90-7348-4c2e-ba95-aebcad1037ee") {
    id
    title
    description
    category
    duration_hours
    price
    total_videos
    total_quizzes
  }
}



---

### 2. Retrieve Student Details (`student`)
Fetches the profile details of a student by their unique user ID.

**GraphQL Syntax:**
```graphql
query GetStudent($id: ID!) {
  student(id: "a981975a-d709-4bdc-897d-d6a7148599bd") {
    id
    name
    email
  }
}
```


---

### 3. Get Student Progress (`progress`)
Fetches learning progress statistics for a specific student enrolled in a specific course.

**GraphQL Syntax:**
```graphql
query GetProgress($student_id: ID!, $course_id: ID!) {
  progress(student_id: "a981975a-d709-4bdc-897d-d6a7148599bd", course_id: "bf43c709-974f-48c8-be47-e94bb7f6aa44") {
    student_id
    course_id
    watched_videos
    passed_quizzes
    total_videos
    total_quizzes
    time_spent_seconds
    percentage
    completed
  }
}
```


---

### 4. Fetch Actions Log History (`actions`)
Fetches the collection of actions recorded by a specific student on a specific course.

**GraphQL Syntax:**
```graphql
query GetActions($student_id: ID!, $course_id: ID!) {
  actions(student_id: $student_id, course_id: $course_id) {
    id
    student_id
    course_id
    action_type
    resource_id
    time_spent_seconds
    quiz_score
    created_at
  }
}
```



### 5. Fetch Single Certificate (`certificate`)
Fetches a specific course certificate details for a student if issued.

**GraphQL Syntax:**
```graphql
query GetCertificate($student_id: ID!, $course_id: ID!) {
  certificate(student_id: $student_id, course_id: $course_id) {
    id
    student_id
    course_id
    student_name
    course_title
    pdf_path
    email
    issued_at
  }
}
```



---

### 6. List All Issued Certificates (`certificates`)
Lists all issued certificates globally across the platform.

**GraphQL Syntax:**
```graphql
query ListCertificates {
  certificates {
    id
    student_id
    course_id
    student_name
    course_title
    pdf_path
    email
    issued_at
  }
}
```




---

### 7. Consolidated Dashboard View (`dashboard`)
Queries student profile, course details, learning progress, and certificate simultaneously in a single request.

**GraphQL Syntax:**
```graphql
query GetDashboard($student_id: ID!, $course_id: ID!) {
  dashboard(student_id: $student_id, course_id: $course_id) {
    student {
      id
      name
      email
    }
    course {
      id
      title
      description
      category
      price
      total_videos
      total_quizzes
    }
    progress {
      student_id
      course_id
      watched_videos
      passed_quizzes
      percentage
      completed
    }
    certificate {
      id
      pdf_path
      issued_at
    }
  }
}
```



---

## 🛠️ Mutations

### 1. Create a New User/Student (`createUser`)
Registers a new user inside the database.

**GraphQL Syntax:**
```graphql
mutation CreateUser($name: String!, $email: String!, $password: String!, $role: String) {
  createUser(name: $name, email: $email, password: $password, role: $role) {
    id
    name
    email
    role
  }
}
```

### 2. Record Learning Action (`recordAction`)
Sends a learning event (e.g. video watched, quiz passed) to the tracking microservice to update progress.

**GraphQL Syntax:**
```graphql
mutation RecordAction(
  $student_id: ID!
  $course_id: ID!
  $action_type: String!
  $resource_id: String
  $time_spent_seconds: Int
  $quiz_score: Float
  $course_total_videos: Int
  $course_total_quizzes: Int
) {
  recordAction(
    student_id: $student_id
    course_id: $course_id
    action_type: $action_type
    resource_id: $resource_id
    time_spent_seconds: $time_spent_seconds
    quiz_score: $quiz_score
    course_total_videos: $course_total_videos
    course_total_quizzes: $course_total_quizzes
  ) {
    action {
      id
      student_id
      course_id
      action_type
      resource_id
      time_spent_seconds
      quiz_score
      created_at
    }
    progress {
      student_id
      course_id
      watched_videos
      passed_quizzes
      total_videos
      total_quizzes
      percentage
      completed
    }
  }
}
```


---

### 3. Issue Course Certificate (`issueCertificate`)
Triggers the certification microservice to generate and email a PDF certificate.

**GraphQL Syntax:**
```graphql
mutation IssueCertificate(
  $student_id: ID!
  $course_id: ID!
  $student_name: String!
  $student_email: String!
  $course_title: String!
  $progress_percentage: Float!
) {
  issueCertificate(
    student_id: $student_id
    course_id: $course_id
    student_name: $student_name
    student_email: $student_email
    course_title: $course_title
    progress_percentage: $progress_percentage
  ) {
    message
    certificate {
      id
      student_id
      course_id
      student_name
      course_title
      pdf_path
      email
      issued_at
    }
  }
}
```


## 💡 Pro-Tips for Postman
1. **Request Type:** Change the request method to `POST`.
2. **URL:** Enter `http://localhost:3000/graphql`.
3. **Body Tab:** Select **raw** and choose **JSON** format.
4. **Variable Injection:** You can use Postman environment/collection variables inside the `variables` property block exactly like standard JSON.

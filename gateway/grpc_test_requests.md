# Academix gRPC Testing Guide & Payloads (Direct Calls)

This document provides a comprehensive resource for testing the three running Academix gRPC microservices directly, bypassing the REST/GraphQL API Gateway. 

You can test them using **automated scripts**, **`grpcurl` (the CLI tool)**, or **GUI clients (like Postman or Insomnia)**.

---

## 📡 Microservice Topology

| Service Name | Package | Port | Protobuf Schema | Primary Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **CourseService (MS1)** | `academix` | `localhost:50051` | `proto/course.proto` | Course definitions, user registration, enrollments. |
| **TrackingService (MS2)** | `onlinecourse` | `localhost:50052` | `proto/tracking.proto` | Student actions tracking & progress calculation. |
| **CertificationService (MS3)** | `onlinecourse` | `localhost:50053` | `proto/tracking.proto` | Automated PDF certificate issuing and record-keeping. |

---

## ⚡ 1. The Simplest Way: Run the Automated gRPC Script
I have created a fully automated direct gRPC verification script inside the project: [scripts/testGrpcDirectly.js](file:///c:/Users/moham/Documents/academix/scripts/testGrpcDirectly.js).

This script automatically makes direct gRPC connections to ports `50051`, `50052`, and `50053`, tests all three services, resolves queries using valid IDs from your active database, and outputs the results clearly.

To run it, open your terminal at the root of the workspace and execute:
```bash
node scripts/testGrpcDirectly.js
```

---

## 💻 2. Testing via CLI with `grpcurl`
[`grpcurl`](https://github.com/fullstorydev/grpcurl) is a command-line tool that lets you interact with gRPC servers just like `curl` does for REST.

### Installation:
- **macOS:** `brew install grpcurl`
- **Windows (Chocolatey):** `choco install grpcurl`
- **Linux:** Download from releases page, or `apt-get install grpcurl` on Debian/Ubuntu.

> [!NOTE]
> Since gRPC reflection is not explicitly turned on in these node gRPC servers, you **must** pass the path of the `.proto` file using the `-proto` parameter when calling `grpcurl`. All commands below are run from the project root directory.

---

### 📚 CourseService (MS1) - `localhost:50051`
These commands interact directly with the SQLite-backed Pedagogical microservice.

#### A. List Courses (`ListCourses`)3
Fetches all courses in the database with optional filtering and pagination.
```bash
grpcurl -plaintext \
  -proto proto/course.proto \
  -d '{"category": "", "page": 1, "limit": 10}' \
  localhost:50051 \
  academix.CourseService/ListCourses
```

#### B. Get Student Profile (`GetStudent`)
Resolves profile details of a student by their ID.
```bash
grpcurl -plaintext \
  -proto proto/course.proto \
  -d '{"student_id": "311f0b48-fed8-42a9-95db-9367ba6f6b2a"}' \
  localhost:50051 \
  academix.CourseService/GetStudent
```

#### C. Get Course Details (`GetCourse`)
Resolves course details by its ID.
```bash
grpcurl -plaintext \
  -proto proto/course.proto \
  -d '{"id": "7ef54c90-7348-4c2e-ba95-aebcad1037ee"}' \
  localhost:50051 \
  academix.CourseService/GetCourse
```

#### D. Create a New User (`CreateUser`)
```bash
grpcurl -plaintext \
  -proto proto/course.proto \
  -d '{"name": "gRPC Tester", "email": "grpc.tester@academix.com", "password": "securepass123", "role": "student"}' \
  localhost:50051 \
  academix.CourseService/CreateUser
```

#### E. Enroll Student in a Course (`CreateEnrollment`)
```bash
grpcurl -plaintext \
  -proto proto/course.proto \
  -d '{"user_id": "311f0b48-fed8-42a9-95db-9367ba6f6b2a", "course_id": "7ef54c90-7348-4c2e-ba95-aebcad1037ee"}' \
  localhost:50051 \
  academix.CourseService/CreateEnrollment
```

---

### 📊 TrackingService (MS2) - `localhost:50052`
These commands interact directly with the Tracking microservice.

#### A. Record Learning Action (`RecordAction`)
Logs an action (e.g. video watched, quiz passed) to update progress.
```bash
grpcurl -plaintext \
  -proto proto/tracking.proto \
  -d '{"student_id": "311f0b48-fed8-42a9-95db-9367ba6f6b2a", "course_id": "7ef54c90-7348-4c2e-ba95-aebcad1037ee", "action_type": "video_watched", "resource_id": "lesson_1_video", "time_spent_seconds": 180, "course_total_videos": 10, "course_total_quizzes": 2}' \
  localhost:50052 \
  onlinecourse.TrackingService/RecordAction
```

#### B. Get Current Progress (`GetProgress`)
Fetches progress stats for a specific enrollment.
```bash
grpcurl -plaintext \
  -proto proto/tracking.proto \
  -d '{"student_id": "311f0b48-fed8-42a9-95db-9367ba6f6b2a", "course_id": "7ef54c90-7348-4c2e-ba95-aebcad1037ee"}' \
  localhost:50052 \
  onlinecourse.TrackingService/GetProgress
```

---

### 🔷 CertificationService (MS3) - `localhost:50053`
These commands interact directly with the Certification microservice.

#### A. List Issued Certificates (`ListCertificates`)
Retrieves a global list of all certificates issued on the platform.
```bash
grpcurl -plaintext \
  -proto proto/tracking.proto \
  -d '{}' \
  localhost:50053 \
  onlinecourse.CertificationService/ListCertificates
```

#### B. Issue Certificate (`IssueCertificate`)
Manually triggers a new PDF certificate generation.
```bash
grpcurl -plaintext \
  -proto proto/tracking.proto \
  -d '{"student_id": "311f0b48-fed8-42a9-95db-9367ba6f6b2a", "course_id": "7ef54c90-7348-4c2e-ba95-aebcad1037ee", "student_name": "Alice Student", "student_email": "alice@test.com", "course_title": "Introduction to Node.js", "progress_percentage": 100.0}' \
  localhost:50053 \
  onlinecourse.CertificationService/IssueCertificate
```

---

## 🎨 3. GUI gRPC Testing in Postman
If you prefer a visual interface, Postman has native gRPC support!

### Step-by-Step Instructions:
1. **Create Request:** In Postman, click **New** -> **gRPC**.
2. **Enter Server URL:** 
   - Enter `localhost:50051` for the **CourseService**
   - Enter `localhost:50052` for the **TrackingService**
   - Enter `localhost:50053` for the **CertificationService**
3. **Import Protobuf:**
   - Under the **Service Definition** dropdown, select **Import a .proto file**.
   - Select the respective proto file: [proto/course.proto](file:///c:/Users/moham/Documents/academix/proto/course.proto) or [proto/tracking.proto](file:///c:/Users/moham/Documents/academix/proto/tracking.proto).
4. **Choose Method:** Under the **Method** dropdown, select the RPC method you want to test (e.g. `ListCourses` or `GetProgress`).
5. **Construct JSON Payload:**
   - Go to the **Message** tab.
   - Click **Generate Template** to automatically build a valid JSON request payload body structure!
   - Fill in actual testing IDs (e.g. course `7ef54c90-7348-4c2e-ba95-aebcad1037ee` or student `311f0b48-fed8-42a9-95db-9367ba6f6b2a`).
6. **Send:** Click the **Invoke** button to see the direct gRPC response JSON output.

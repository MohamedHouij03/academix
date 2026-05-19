# 🎓 Academix Architecture & Learning Guide

Welcome to the comprehensive architecture guide for **Academix** — a state-of-the-art, event-driven, microservices-based online learning platform. 

This document breaks down every concept, technology, architectural decision, and step-by-step workflow in your codebase. Whether you are explaining this project to others or building onto it, this guide serves as your single source of truth.

---

## 🗺️ The Big Picture: What Are We Trying to Do?

At its core, **Academix** is an online learning platform (similar to Udemy or Coursera). However, instead of building it as a single, massive, monolithic application, we have engineered it as a **distributed system of microservices**. 

### The Product Goal
1. **Manage courses, users, and enrollments** (Pedagogical Management).
2. **Track student progress in real-time** (e.g., videos watched, quizzes completed).
3. **Automatically issue PDF certificates** via email when a student finishes 100% of a course.
4. **Provide a unified Dashboard** that displays a student's profile, course details, learning progress, and certificate details in a single query.

---

## 🧠 Step-by-Step Terminology Guide

Before diving into the system flows, let's demystify every core technology and term used in this project.

### 1. Microservices Architecture
In a monolith, all code (billing, courses, tracking) lives in one codebase and runs in one process. If one part crashes or gets overloaded, the whole site goes down.
* **In Academix:** We divide the business logic into **four independent services** (one API Gateway and three backend microservices). Each service has its own codebase, its own database, runs in its own process, and can be scaled or updated independently without breaking the others.

### 2. API Gateway
Clients (like a mobile app or a web browser) should not have to talk to ten different microservices directly. They don't need to know which port each service is running on.
* **In Academix:** The **API Gateway** acts as the single entry point. It accepts incoming client requests, handles routing, translates between protocols (REST/GraphQL to gRPC), and aggregates responses from multiple backend microservices before sending a single clean response back to the client.

### 3. REST (Representational State Transfer)
REST is the industry-standard way of building web APIs using standard HTTP methods (`GET`, `POST`, `PUT`, `DELETE`). 
* **In Academix:** Used for standard, simple CRUD (Create, Read, Update, Delete) operations. For example, creating a user, creating a course, or listing courses are simple and highly cacheable operations, making REST the perfect fit.

### 4. GraphQL
Unlike REST (which returns fixed data structures from specific URLs), GraphQL lets the client write a query to request **exactly the fields they need**, and no more.
* **In Academix:** Used for the **Student Dashboard**. A dashboard requires data from three different services: student details (MS1), progress metrics (MS2), and certificate status (MS3). With GraphQL, the client makes **one query** (`/graphql`), and the API Gateway handles fetching data from all three backend services in parallel and merging it. This prevents the client from making 3-4 separate network calls.

### 5. gRPC (Google Remote Procedure Call)
While the client talks to the API Gateway over standard HTTP (REST/GraphQL), the API Gateway talks to the microservices over **gRPC**. 
* **Why gRPC?** Traditional HTTP REST APIs between microservices are slow and pass verbose JSON text. gRPC is built on **HTTP/2** and transmits data in a **highly compressed binary format**. It allows microservices to call functions on other microservices as if they were local function calls (Remote Procedure Calls), making it incredibly fast and efficient.

### 6. Protocol Buffers (Protobuf)
gRPC uses **Protocol Buffers** (`.proto` files) as its Interface Definition Language (IDL). 
* **In Academix:** We define our data models and service methods in `proto/course.proto` and `proto/tracking.proto`. Think of these as a strict, strongly-typed contract. Both the API Gateway and the microservices must adhere to this contract. If the gateway tries to send a field that doesn't match the proto file, the compiler/runtime immediately flags it. This prevents interface drift.

### 7. Apache Kafka & Event-Driven Architecture
In a microservices architecture, services often need to react when something happens in another service. 
* **The Monolith Way:** MS1 calls MS2's API directly. If MS2 is down, the action fails. This is called **tight coupling**.
* **The Event-Driven Way (Kafka):** Instead of calling each other directly, services publish "events" to a central message broker called **Apache Kafka**. Other services subscribe to Kafka and listen for events they care about. If a subscribing service is temporarily offline, Kafka saves the messages, and the service processes them when it boots back up. This is called **loose coupling** or **asynchronous communication**.
  * **Producer:** A service that creates and sends an event (e.g., MS1 produces `ENROLLMENT_CREATED`).
  * **Consumer:** A service that listens for and processes events (e.g., MS2 consumes enrollment events).
  * **Topic:** A named folder or channel in Kafka where events are posted (e.g., `enrollment-events`, `tracking-events`).
  * **Consumer Group:** A group of consumers reading from the same topic. Using distinct group IDs ensures that messages are distributed correctly and no service processes a duplicate message.

### 8. Databases: SQLite vs RxDB
Each microservice is responsible for its own data store (a core microservices principle):
* **SQLite (MS1 & MS3):** A lightweight, file-based relational database. Perfect for structured relational data like users, courses, and certificates.
* **RxDB (MS2):** A reactive, in-memory database. Tracking progress requires logging thousands of micro-actions (e.g., "watched 5 seconds of video"). RxDB is highly performant for rapid write/read operations and stores data reactively.

---

## 🏗️ Detailed Step-by-Step Workflows

Here is exactly how the microservices cooperate to execute the three major user flows.

### Flow 1: Student Enrollment (REST ➔ MS1 ➔ Kafka ➔ MS2)

```
[Client] ──(REST POST /api/inscriptions)──► [API Gateway]
                                                  │
                                             (gRPC call)
                                                  ▼
                                            [MS1 Pedagogical]
                                            • Saves to SQLite
                                            • Publishes Event
                                                  │
                                                  ▼ (Kafka topic: enrollment-events)
                                            [MS2 Tracking]
                                            • Seeds progress to 0% in RxDB
```

1. **Client Action:** The client sends an enrollment request: `POST http://localhost:3000/api/inscriptions` with `{ "user_id": "123", "course_id": "ABC" }`.
2. **Gateway:** The API Gateway receives the REST request and translates it into a fast gRPC call to **MS1 Pedagogical**.
3. **MS1 Processing:** 
   * MS1 registers the enrollment in its SQLite database.
   * It then uses `kafkajs` to publish an event (`ENROLLMENT_CREATED`) to the Kafka topic **`enrollment-events`**.
   * It immediately responds back to the Gateway with success, meaning the user doesn't have to wait.
4. **Asynchronous Consumer (MS2):** **MS2 Tracking** is constantly listening to the `enrollment-events` topic. It detects the `ENROLLMENT_CREATED` event, extracts the student and course IDs, and seeds an initial tracking record in its **RxDB database** with `progress = 0%`. 
   * *Why?* This ensures that if the gateway asks for the student's progress right after enrolling, MS2 can immediately return `0%` instead of throwing a "Not Found" error.

---

### Flow 2: Recording Student Actions (REST ➔ MS2 ➔ Kafka)

```
[Client] ──(REST POST /tracking/actions)──► [API Gateway]
                                                  │
                                             (gRPC call)
                                                  ▼
                                            [MS2 Tracking]
                                            • Saves action in RxDB
                                            • Recalculates progress %
                                            • Publishes tracking event
                                                  │
                                                  ▼ (Kafka topic: tracking-events)
                                            [MS3 Certification]
                                            • Listens to events
                                            • Ignores if progress < 100%
```

1. **Client Action:** A student watches a video. The client sends a request: `POST http://localhost:3000/tracking/actions` with details (e.g., student ID, course ID, action type: "video_watched", progress details).
2. **Gateway:** Transmits this to **MS2 Tracking** via gRPC.
3. **MS2 Processing:**
   * MS2 saves the action in **RxDB**.
   * It calculates the new progress percentage.
   * It publishes a `progress.updated` event containing the updated percentage to the Kafka topic **`tracking-events`**.
4. **Consumer (MS3):** **MS3 Certification** is listening to `tracking-events`. It sees the event but notices that `completed: false` and the progress is less than 100%. It gracefully ignores the event.

---

### Flow 3: Course Completion & Automated Certification (Kafka ➔ MS3)

```
[Student reaches 100% Progress]
              │
              ▼
        [MS2 Tracking]
        • Publishes completed event
              │
              ▼ (Kafka topic: tracking-events)
        [MS3 Certification]
        • Detects "course.completed"
        • Generates PDF certificate (PDFKit)
        • Stores record in SQLite
        • Sends email notification (Nodemailer)
```

1. **Milestone Reached:** The student completes the final quiz or action. **MS2 Tracking** recalculates progress and finds it has reached **100%**.
2. **MS2 Event:** MS2 publishes an event with `event_type: "course.completed"` and `completed: true` to the Kafka topic **`tracking-events`**.
3. **MS3 Processing:**
   * **MS3 Certification** consumes the event, recognizes that `completed: true`, and triggers its certificate generator.
   * Using **PDFKit**, MS3 dynamically generates a high-quality PDF certificate with the student's name and course title.
   * It saves the certificate record (ID, student ID, course ID, issue date) in its **SQLite database**.
   * Using **Nodemailer**, it automatically sends an email notification to the student with their brand new certificate!

---

## 🛠️ Testing Kafka Step-by-Step (Fixing Common Errors)

In your testing, you might have run into an error like:
`unable to start container process: exec: "kafka-console-consumer.sh": executable file not found in $PATH`

### 💡 Why did this happen?
The official `apache/kafka:latest` Docker image keeps its CLI tools inside `/opt/kafka/bin/`, but this directory is not added to the system shell's `$PATH` variable by default. To run them, you must use their **absolute paths**.

Here are the exact, working PowerShell commands to test your Kafka streams:

### 1. Inspect Kafka Topics
To list all active topics inside the running Docker container, run:
```powershell
docker exec -it online-course-kafka /opt/kafka/bin/kafka-topics.sh --bootstrap-server localhost:9092 --list
```
*(You should see `enrollment-events` and `tracking-events` if your microservices have booted up and created them.)*

### 2. Start a Consumer (To Listen)
Open a terminal and run this to listen to the `tracking-events` topic from the beginning:
```powershell
docker exec -it online-course-kafka /opt/kafka/bin/kafka-console-consumer.sh --bootstrap-server localhost:9092 --topic tracking-events --from-beginning
```
*(This terminal will stay open and "hang", listening for any new progress or completion events.)*

### 3. Start a Producer (To Write Messages Manually)
Open a **second, separate terminal** and run this to start a manual event producer:
```powershell
docker exec -it online-course-kafka /opt/kafka/bin/kafka-console-producer.sh --bootstrap-server localhost:9092 --topic tracking-events
```
Once you see the `>` prompt, you can copy-paste a mock completion event JSON to trigger MS3!
```json
{"event_id": "test-uuid-123", "event_type": "course.completed", "student_id": "1", "course_id": "1", "progress_percentage": 100, "completed": true, "created_at": "2026-05-18T22:00:00.000Z"}
```
Press **Enter**, and watch:
* Your **Consumer** terminal will instantly output the JSON.
* **MS3 Certification** logs will show it consumed the event and automatically generated a certificate!

---

## 🚀 How to Run the Whole Project

When you are ready to test the entire system end-to-end:

### Step 1: Fire up Kafka
Make sure the Kafka broker is running in Docker:
```powershell
docker-compose -f docker-compose.kafka.yml up -d
```

### Step 2: Install dependencies
Run this in the root folder to make sure everything is installed:
```powershell
npm install
```

### Step 3: Run all Microservices
You can run all microservices and the API Gateway in parallel using the preconfigured script:
```powershell
npm run start:all
```
*(This will boot up MS1, MS2, MS3, and the Gateway concurrently. You will see colored logs from each service in your console.)*

### Step 4: Test end-to-end!
You can use the helper script to run a full test sequence:
```powershell
npm run test:gateway
```
This runs a simulated workflow (creating a user, creating a course, enrolling the user, updating progress, reaching 100%, and validating that a certificate was successfully issued).

---

### 📂 Directory Map Reference
```
academix/
├── proto/                         # Canonical, shared Protocol Buffer API contracts
│   ├── course.proto               # Contract for MS1 (courses, users, enrollments)
│   └── tracking.proto             # Contract for MS2 and MS3
├── gateway/                       # API Gateway (Express REST + Apollo GraphQL)
│   ├── apiGateway.js              # Entry point (port 3000)
│   ├── schema.gql                 # GraphQL dashboard schema
│   ├── resolvers.js               # GraphQL resolvers doing parallel gRPC fetching
│   └── rest-routes/               # REST router endpoints
├── ms1-pedagogical/               # MS1: Relational SQLite DB + Kafka producer
│   └── src/
│       ├── grpc-server.js         # Port 50051 gRPC server
│       ├── models/                # SQLite database schemas (Sequelize/Direct SQLite)
│       └── services/              # Course services and Kafka producer client
├── ms2-tracking/                  # MS2: RxDB memory DB + Kafka consumer & producer
│   ├── trackingMicroservice.js    # Port 50052 gRPC server
│   ├── kafkaConsumer.js           # Subscribes to enrollment-events
│   └── trackingResolver.js        # Progress logic + Kafka producer
├── ms3-certification/             # MS3: SQLite DB + Kafka consumer + PDF & Email engines
│   ├── certificationMicroservice.js  # Port 50053 gRPC server
│   └── kafkaConsumer.js           # Subscribes to tracking-events (triggers pdf/email)
└── docker-compose.kafka.yml       # Docker definition for Apache Kafka (Kraft mode)
```

Now you have a complete, professional grasp on the entire **Academix** ecosystem! Happy coding! 🚀

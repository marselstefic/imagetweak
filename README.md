# ImageTweak – Cloud-Based Image Processing Platform

## 🧭 Overview
**ImageTweak** is a cloud-based web application developed using **Next.js** and **Amazon Web Services (AWS)**.  
The system enables users to upload, process, and view images directly through a modern web interface.  
The project demonstrates the implementation of a **serverless architecture**, leveraging AWS Lambda, S3, and DynamoDB to deliver scalable and efficient image processing functionality.

This project was developed as part of an academic research work focusing on cloud-based systems, distributed processing, and performance testing of web applications.

---

## ⚙️ System Architecture
The system follows a modular and serverless design:

1. **Frontend (Next.js)**  
   - Provides routes `/upload` and `/gallery`  
   - Implements image upload functionality via **Ant Design Upload** component  
   - Uses **shadcn/ui** and **Radix UI** for interface components  
   - Authenticates users via **Clerk**

2. **Backend and Cloud Infrastructure (AWS)**  
   - **S3** – for image storage and retrieval  
   - **Lambda** – for on-demand image processing (resize, brightness, contrast, filters)  
   - **DynamoDB** – for metadata persistence (user, timestamp, image parameters)  
   - **CloudWatch** – for monitoring and logging of performance metrics  
   - **ECR + Docker** – for deploying custom image processing logic using Python

3. **Security and Authentication**  
   - Clerk handles user sessions and authentication  
   - IAM policies restrict AWS access to per-user resources  
   - Environment variables manage credentials securely at runtime

---

## 📦 Technologies Used

| Category | Technology |
|-----------|-------------|
| Frontend | Next.js (React + TypeScript) |
| UI | Ant Design, shadcn/ui, Radix UI |
| Backend | AWS Lambda, API Routes |
| Database | AWS DynamoDB |
| Storage | AWS S3 |
| Monitoring | AWS CloudWatch |
| Authentication | Clerk |
| Image Processing | Sharp (Node.js) / Python (Docker container) |
| Testing | k6 (Grafana Labs) |
| Deployment | AWS / Localhost |

---

## 🧪 Testing and Performance Analysis
System load and response time were evaluated using **k6**, an open-source performance testing framework by Grafana Labs.  
Tests simulated concurrent users uploading and processing images under different parameter configurations.

Metrics such as **processing duration**, **concurrent executions**, and **system stability under load** were monitored via **CloudWatch**.  
Results demonstrated stable operation under moderate concurrency and highlighted Lambda’s scalability limits when approaching higher parallel workloads.

---

## 🚀 Local Setup and Deployment

### 1. Clone the Repository
```bash
git clone https://github.com/marselstefic/imagetweak.git
cd imagetweak
```

### 2. Install Dependencies
```bash
npm install
# or
yarn install
```

### 3. Configure Environment Variables
Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key
CLERK_WEBHOOK_SECRET=your_clerk_webhook_secret

AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
AWS_REGION=eu-central-1
AWS_S3_BUCKET_NAME=image-tweak-bucket
```

### 4. Run the Development Server
```bash
npm run dev
```
Visit the app at `http://localhost:3000`.

### 5. Deploying to AWS / Vercel
You can deploy the frontend to **Vercel** or any Node.js hosting service.  
Backend image processing runs serverlessly on **AWS Lambda**, triggered by uploads or API calls.

---

## ☁️ AWS Integration Details

| Service | Role |
|----------|------|
| **S3** | Storage for uploaded and processed images |
| **Lambda** | Executes image transformations dynamically |
| **DynamoDB** | Stores metadata about uploads |
| **CloudWatch** | Monitors execution duration, concurrency, and errors |
| **ECR + Docker** | Hosts the custom Python image processing container |

---

## 📊 Example Test Configuration (k6)
```js
import http from "k6/http";
import { check } from "k6";

export const options = {
  vus: 5,
  iterations: 1,
  maxDuration: "20s",
};

export default function () {
  const url = "http://localhost:3000/api/upload";
  const file = open("./test.jpg", "b");

  const metadata = { user: "test-user", parameters: { brightness: 50, contrast: 50 } };

  const payload = {
    metadata: http.file(JSON.stringify(metadata), "metadata.json", "application/json"),
    file: http.file(file, "test.jpg", "image/jpeg"),
  };

  const res = http.post(url, payload);
  check(res, { "status is 200": (r) => r.status === 200 });
}
```

---

## 📸 Key Features
- Secure user authentication (Clerk)  
- Upload, view, and manage personal image gallery  
- Real-time image processing (resize, brightness, filters, etc.)  
- Scalable serverless backend on AWS  
- Automated performance testing via k6  

---

## 📈 Future Improvements
- Implement time-limited S3 URLs for enhanced security  
- Introduce JWT-based API validation  
- Add advanced RBAC and two-factor authentication  
- Integrate machine learning models for image enhancement and recognition  

---

## 🧾 License
This project is released under the **MIT License**.  
Feel free to use, modify, or distribute it with proper attribution.

---

## 🔗 Repository
GitHub: [https://github.com/marselstefic/imagetweak](https://github.com/marselstefic/imagetweak)

---

## ✍️ Author
Developed by **Marsel Stefić**  
Faculty of Electrical Engineering and Computer Science, University of Maribor  
2025

# IT104-GO-JOB

IT104-GO-JOB is a comprehensive job board web application designed to connect job seekers with employers. It provides a platform for companies to post job openings and for job seekers to find and apply for jobs that match their skills and preferences.

## Table of Contents

- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Local Installation](#local-installation)
- [Deployment](#deployment)
  - [Deploying with Vercel](#deploying-with-vercel)
- [Tech Stack](#tech-stack)
- [Dependencies](#dependencies)
- [Features](#features)
  - [Job Seeker Features](#job-seeker-features)
  - [Employer Features](#employer-features)
- [Project Structure](#project-structure)
- [Authors](#authors)

## Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

- Node.js (v18 or later recommended)
- npm or yarn
- A Supabase account for database and authentication services.
- Email account credentials if using another SMTP provider with Nodemailer.

### Local Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/it104-go-job-refactored.git
    cd it104-go-job-refactored
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Set up environment variables:**
    Create a file named `.env.local` in the root of your project and add the following environment variables. You can get the Supabase URL and Anon Key from your Supabase project dashboard.

    ```env
    # Supabase
    NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
    NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

    # JWT Secret for token signing
    JWT_SECRET=your_strong_jwt_secret

    # Email service (Nodemailer with a provider like Gmail or AWS SES)
    EMAIL_HOST=smtp.example.com
    EMAIL_PORT=587
    EMAIL_USER=your_email@example.com
    EMAIL_PASS=your_email_password
    ```

4.  **Run the development server:**
    The project uses Next.js with Turbopack for fast development.
    ```bash
    npm run dev
    ```

    Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Deployment

### Deploying with Vercel

The easiest way to deploy this Next.js app is to use the [Vercel Platform](https://vercel.com/new).

1.  Push your code to a Git repository (GitHub, GitLab, Bitbucket).
2.  Import your project into Vercel.
3.  Vercel will automatically detect that you are using Next.js and configure the build settings.
4.  **Important:** Add the same environment variables from your `.env.local` file to the Vercel project settings. Go to your project's "Settings" tab and then "Environment Variables".
5.  Deploy! Your application will be live.

## Tech Stack

-   **Framework:** [Next.js](https://nextjs.org/)
-   **Programming Language:** [JavaScript](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
-   **Frontend:** [React](https://react.dev/)
-   **Styling:** [Tailwind CSS](https://tailwindcss.com/) & Custom CSS
-   **Backend & Database:** [Supabase](https://supabase.io/) (PostgreSQL)
-   **Authentication:** [JSON Web Tokens (JWT)](https://jwt.io/), [bcryptjs](https://www.npmjs.com/package/bcryptjs)
-   **Email Service:** [Nodemailer](https://nodemailer.com/)
-   **PDF Handling:** [@react-pdf/renderer](https://react-pdf.org/) for generation and [react-pdf](https://github.com/wojtekmaj/react-pdf) for display.

## Dependencies

### Main Dependencies
- **@react-pdf/renderer**: `^3.4.4`
- **@supabase/supabase-js**: `^2.43.4`
- **bcryptjs**: `^2.4.3`
- **jsonwebtoken**: `^9.0.2`
- **next**: `14.2.3`
- **nodemailer**: `^6.9.13`
- **react**: `^18`
- **react-dom**: `^18`
- **react-dropzone**: `^14.2.3`
- **react-hot-toast**: `^2.4.1`
- **react-icons**: `^5.2.1`
- **react-pdf**: `^9.0.0`
- **react-spinners**: `^0.13.8`

### Development Dependencies
- **eslint**: `^8`
- **eslint-config-next**: `14.2.3`
- **postcss**: `^8`
- **tailwindcss**: `^3.4.3`

## Features

### Job Seeker Features

-   **Authentication:** Secure registration and login.
-   **Profile Management:** Create and manage a personal profile, including photo and resume upload.
-   **Job Search:** Search and filter jobs by various criteria.
-   **Recommended Jobs:** Get job recommendations based on profile and preferences.
-   **Job Applications:** Apply for jobs and track application status.
-   **Saved Jobs:** Save interesting jobs for later.
-   **Company Profiles:** View company details, follow companies, and read/write ratings.
-   **Notifications:** Receive updates on applications and followed companies.

### Employer Features

-   **Authentication:** Secure registration and login for company representatives.
-   **Company Profile:** Create and manage the company's profile.
-   **Job Postings:** Create, edit, and manage job postings.
-   **Applicant Viewing:** View a list of applicants for each job posting and access their resumes.
-   **Job Requests:** Handle incoming requests related to jobs.
-   **Posting History:** Keep track of all past and present job postings.
-   **Notifications:** Receive alerts for new applications.

## Project Structure

The project follows the Next.js App Router structure.

```
/
|-- app/                    # Main application folder
|   |-- api/                # API routes for backend logic
|   |-- company/            # Public company profile pages
|   |-- components/         # Reusable React components
|   |-- Dashboard/          # Main dashboard layouts and pages for users
|   |   |-- employee/       # Pages specific to the employer role
|   |   |-- jobseeker/      # Pages specific to the job seeker role
|   |-- hooks/              # Custom React hooks
|   |-- jobs/               # Public job listing and detail pages
|   |-- lib/                # Library files and services (Supabase, auth, email)
|   |-- Login/              # Login, registration, and verification pages
|   |-- Welcome/            # Welcome page for new users
|   |-- layout.js           # Root layout of the application
|   |-- page.js             # Main landing page (redirects to Welcome)
|-- public/                 # Static assets (images, icons)
|-- scripts/                # Utility scripts
|-- SQL/                    # SQL scripts for database schema
|-- next.config.mjs         # Next.js configuration
|-- postcss.config.mjs      # PostCSS configuration
|-- jsconfig.json           # JS configuration
|-- package.json            # Project dependencies and scripts
```

-   **`app/api`**: Contains all the backend logic, organized by resource and action.
-   **`app/lib`**: Core service logic for interacting with external services like Supabase and Nodemailer, and for handling business logic like authentication and job matching.
-   **`app/Dashboard`**: This is the heart of the user-facing application, with nested routes for different user roles and their specific functionalities.

## Authors
-   Jonathan Lance Mayo
-   Christopher Jacob Ong
-   Sebastian Vidal

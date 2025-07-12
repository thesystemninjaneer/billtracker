# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.


Microservices Breakdown

    User Service:

        Manages user registration, login, and profile configurations.

        Handles authentication and authorization.

    Organization Service:

        Manages billing organization details (e.g., company name, account number, typical due date).

        Provides APIs for adding, editing, deleting, and listing organizations.

    Bill Payment Service:

        Manages individual monthly bill payment entries (e.g., amount due, due date, actual paid date, confirmation code).

        Provides APIs for recording, updating, and deleting paid bill details.

        Links payments to specific organizations and users.

    Notification Service:

        Handles automated email alerts.

        Triggers notifications based on upcoming bill due dates.

        Generates email content with summaries and links.

Data Flow and Communication

Image of Microservices and monolithic service oriented architecture outline diagram Opens in a new window

Licensed by Google
Microservices and monolithic service oriented architecture outline diagram

    Frontend (React App) communicates with the backend services primarily through their respective REST APIs.

    Backend Services communicate with each other via internal API interservice communication (e.g., HTTP/REST or a message broker). For example, the Notification Service will query the Bill Payment Service to get upcoming bill details.

    MySQL Database will be the persistent storage for all services. Each service will ideally have its own dedicated database schema or database instance for true microservices isolation, though a shared database with separate tables is also an option for simplicity initially.

Technical Stack

    Frontend: React.js (with a routing library like React Router and a state management library like Redux or React Context API).

    Backend (Microservices): A robust framework like Node.js with Express, Python with Flask/Django REST Framework, or Java with Spring Boot. Each service can potentially use a different technology if needed, showcasing polyglot persistence and programming.

    Database: MySQL for relational data storage.

    Containerization: Docker for packaging each microservice and the React app.

    Orchestration: Docker Compose for local development, and Kubernetes for production deployment and scaling.

    API Gateway (Optional but Recommended): For routing external requests to the correct microservice and handling cross-cutting concerns like authentication.

    Message Broker (Optional but Recommended for Notifications): RabbitMQ or Kafka could be used by the Notification Service to process email queues asynchronously.

Key Features and Implementation Details

React Frontend

The user interface will be intuitive and responsive.

    Authentication/Authorization: User login/registration handled by the User Service.

    Billing Organization Management:

        A dedicated web form for users to add new billing organizations, including fields for:

            Organization Name (e.g., "Dominion Energy", "Verizon Fios")

            Account Number

            Typical Due Day of Month

            Website/Contact Info

        Ability to edit and delete existing organization details.

        A list view of all configured organizations.

    Monthly Bill Recording:

        An input web form to record monthly paid bill details. This form would likely be linked from the organization details or a general "Record Payment" section.

        Fields would include:

            Associated Billing Organization (dropdown)

            Bill Due Date

            Amount Due

            Date Paid

            Payment Confirmation Code

            Amount Paid (actual amount paid, in case it differs from amount due)

        Ability to edit and delete recorded payments.

    Dashboard Displays:

        Upcoming Bills Due: A section displaying bills that are due soon, potentially highlighted by proximity to the due date. This will fetch data from the Bill Payment Service.

        Recently Paid Bills: A section showing the last N bills that have been marked as paid, including key details like organization, amount, and date paid.

MySQL Backend

Each service will interact with the MySQL database to store and retrieve its specific data.

    User Service Schema:

        users table: id, username, password_hash, email, profile_config (e.g., notification preferences).

    Organization Service Schema:

        organizations table: id, user_id (foreign key), name, account_number, typical_due_day, website.

    Bill Payment Service Schema:

        bills table: id, organization_id (foreign key), user_id (foreign key), due_date, amount_due, is_paid, date_paid, payment_confirmation_code, amount_paid.

API Inter-Service Communication

Each microservice will expose a RESTful API.

    Organization Service APIs:

        GET /organizations: List all organizations for a user.

        GET /organizations/{id}: Get details of a specific organization.

        POST /organizations: Add a new organization.

        PUT /organizations/{id}: Edit an existing organization.

        DELETE /organizations/{id}: Delete an organization.

    Bill Payment Service APIs:

        POST /bills: Add a new bill payment entry.

        PUT /bills/{id}: Update an existing bill payment (e.g., mark as paid).

        DELETE /bills/{id}: Delete a bill payment entry.

        GET /bills/upcoming: List upcoming bills due for a user.

        GET /bills/paid/recent: List recently paid bills for a user.

Automated Alerts (Notification Service)

    A scheduled job within the Notification Service will periodically query the Bill Payment Service for upcoming bills.

    For identified upcoming bills, it will generate and send an email notification to the user associated with the bill.

    The email will include:

        A summary of the upcoming bills (organization, amount, due date).

        A direct link back to the React application, potentially pre-filling details or navigating to the "Record Payment" section for that bill.

Development Workflow (Containerized)

    Individual Service Development: Each microservice can be developed and tested independently in its own container.

    Docker Compose for Local Dev: A docker-compose.yml file will orchestrate all services (frontend, all backend microservices, MySQL database) to run together in a local development environment.

    CI/CD: Set up a continuous integration/continuous deployment pipeline to automate testing, building Docker images, and deploying to a staging/production environment (e.g., Kubernetes cluster).

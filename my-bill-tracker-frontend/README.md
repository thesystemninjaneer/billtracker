# React + Vite

This template provides a setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.


Microservices Breakdown

1. User Service:
    - Manages user registration, login, and profile configurations.
    - Handles authentication and authorization.
2. Organization Service:
    - Manages billing organization details (e.g., company name, account number, typical due date).
    - Provides APIs for adding, editing, deleting, and listing organizations.
3. Bill Payment Service:
    - Manages individual monthly bill payment entries (e.g., amount due, due date, actual paid date, confirmation code).
    - Provides APIs for recording, updating, and deleting paid bill details.
    - Links payments to specific organizations and users.
4. Notification Service:
   - Handles automated email alerts.
   - Triggers notifications based on upcoming bill due dates.
   - Generates email content with summaries and links.

## Data Flow and Communication

Microservices and monolithic service oriented architecture outline.

- Frontend (React App) communicates with the backend services primarily through their respective REST APIs.
- Backend Services communicate with each other via internal API interservice communication (e.g., HTTP/REST or a message broker). For example, the Notification Service will query the Bill Payment Service to get upcoming bill details.
- MySQL Database will be the persistent storage for all services. Each service will ideally have its own dedicated database schema or database instance for true microservices isolation, though a shared database with separate tables is also an option for simplicity initially.

## Technical Stack

- Frontend: React.js (with a routing library like React Router and a state management library like Redux or React Context API).
- Backend (Microservices): A robust framework like Node.js with Express, Python with Flask/Django REST Framework, or Java with Spring Boot. Each service can potentially use a different technology if needed, showcasing polyglot persistence and programming.
- Database: MySQL for relational data storage.
- Containerization: Docker for packaging each microservice and the React app.
- Orchestration: Docker Compose for local development, and Kubernetes for production deployment and scaling.
- API Gateway (Optional but Recommended): For routing external requests to the correct microservice and handling cross-cutting concerns like authentication.
- Message Broker (Optional but Recommended for Notifications): RabbitMQ or Kafka could be used by the Notification Service to process email queues asynchronously.

## Key Features and Implementation Details

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

## MySQL Backend

Each service will interact with the MySQL database to store and retrieve its specific data.

    User Service Schema:

        users table: id, username, password_hash, email, profile_config (e.g., notification preferences).

    Organization Service Schema:

        organizations table: id, user_id (foreign key), name, account_number, typical_due_day, website.

    Bill Payment Service Schema:

        bills table: id, organization_id (foreign key), user_id (foreign key), due_date, amount_due, is_paid, date_paid, payment_confirmation_code, amount_paid.

## API Inter-Service Communication

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

## Automated Alerts (Notification Service)

    A scheduled job within the Notification Service will periodically query the Bill Payment Service for upcoming bills.

    For identified upcoming bills, it will generate and send an email notification to the user associated with the bill.

    The email will include:

        A summary of the upcoming bills (organization, amount, due date).

        A direct link back to the React application, potentially pre-filling details or navigating to the "Record Payment" section for that bill.

## Development Workflow (Containerized)

    Individual Service Development: Each microservice can be developed and tested independently in its own container.

    Docker Compose for Local Dev: A docker-compose.yml file will orchestrate all services (frontend, all backend microservices, MySQL database) to run together in a local development environment.

    CI/CD: Set up a continuous integration/continuous deployment pipeline to automate testing, building Docker images, and deploying to a staging/production environment (e.g., Kubernetes cluster).


## Component Structure Overview

We'll organize our frontend into several key components:

    src/App.jsx: The main application component, handling routing.

    src/components/Header.jsx: A simple navigation header.

    src/pages/Dashboard.jsx: Displays upcoming and recently paid bills.

    src/pages/BillOrganizationForm.jsx: Form for adding/editing bill organizations.

    src/pages/RecordPaymentForm.jsx: Form for recording monthly bill payments.

    src/pages/NotFound.jsx: For handling invalid routes.


## Integration of frontend with organizatgion service

React frontend to make API calls to your newly created Organization Service. This involves:

1. Updating BillOrganizationForm.jsx: To send POST requests for adding and PUT requests for updating. It will also make a GET request if editing an existing organization.

2. Updating Dashboard.jsx: To fetch and display the list of organizations. For now, we'll display the organizations as a list, and eventually, this data will be used to track specific bills associated with them.

3. Establishing API Base URL: A central place to configure the backend API endpoint.

### Details

1. Frontend Configuration

The `./src/config.js` configuration file manages the API endpoint.

2. BillOrganizationForm.jsx integration

This will interact with your Organization Service to add, update, and delete organizations.

The `./src/pages/Forms.css` provieds a simple error message style.

3. List orgs

The `src/pages/Dashboard.jsx` will fetch and display the organizations registered with the backend. It will simply list them. Later, we'll use a separate Bill Payment Service to track specific bills.

The `src/pages/Dashboard.css` file adds styles for new links and sections.

4. organization id

The `RecordPaymentForm.jsx` form primarily uses the organizationId passed from the dashboard to pre-select the organization, rather than relying solely on the name. It fetches the list of organizations from your backend to populate its dropdown.

The`preselected-info` block in src/pages/Forms.css is a simple style for preselected info.

## Running the Integrated Application

1. Backennd

Example code To run the integrated application
```
docker compose up --build -d
```

2. Start frontemd

```
cd my-bill-tracker-frontend
npm run dev
```

3. Browse to frontend

e.g., http://localhost:5173/

observe the following:

    Dashboard: Upon loading, the dashboard will attempt to fetch organizations from http://localhost:3001/organizations and display them. If you previously added dummy data in MySQL, you should see it here.

    Add Organization Form: When you use the "Add Organization" link and submit the form, the data will be sent to your Organization Service via a POST request. You should see a success alert, and after navigating back to the dashboard, the new organization should appear (you might need to refresh the page to see it, or implement state refresh in React, which is a next step).

    Edit Organization Form: Clicking "Edit" next to an organization will pre-fill the form by fetching that organization's details from the backend. Submitting the form sends a PUT request.

    Delete Organization: The delete button sends a DELETE request to the backend.

    Record Payment Form: The "Billing Organization" dropdown will now be populated with organizations fetched from your backend. The payment submission itself is still simulated, as we haven't built the Bill Payment Service yet.


    

## The Organization Service

Thus service will manage your billing organization details, and set up the MySQL database.

For the backend microservices, Node.js with Express.js is used. This combination is lightweight, fast, and excellent for building RESTful APIs, fitting well into a microservices architecture.

Node.js Express application for the Organization Service

### MySQL Database Setup

First, get a MySQL database running. We use docker-compose to manage service during development.

- image: mysql:8.0: Uses the official MySQL 8.0 Docker image.
- environment: Sets up the root password, the default database (bill_tracker_db), and a dedicated user (bill_user) with a password. Make sure to change these passwords to strong, secure ones!
- ports: "3306:3306": Maps the container's 3306 port (MySQL default) to your host machine's 3306 port, allowing you to connect from outside the container.
- volumes: db_data:/var/lib/mysql: This creates a named volume to persist your database data. Even if the container is removed, your data will remain.
- healthcheck: Ensures the database container is fully ready before other services try to connect.

Example command to run the services:
```
docker compose up -d db
```

```

```
docker compose up --build -d
```

to check logs
```
docker compose logs -f organization-service
#You should see Organization Service running on port 3001 and Connected to MySQL database!
```

## Testing the API Endpoints

Use `curl` to test the Organization Service APIs.

The base URL for your Organization Service will be http://localhost:3001.

- Add Organization (POST):
  - URL: http://localhost:3001/organizations
  - Method: POST
  - Headers: Content-Type: application/json
  - Bode (raw JSOB):
    ```json
    {
        "name": "Local Electric Co.",
        "accountNumber": "ELEC00123",
        "typicalDueDay": 25,
        "website": "http://localelectric.com",
        "contactInfo": "555-123-4567"
    }
    ```
- Get All Organizations (GET):
  - URL: http://localhost:3001/organizations
  - Method: GET
- Get Single Organization (GET):
  - URL: http://localhost:3001/organizations/1 (replace 1 with an actual ID from your database or a POST response)
  - Method: GET
- Update Organization (PUT):
  - URL: http://localhost:3001/organizations/1
  - Method: PUT
  - Headers: Content-Type: application/json
  - Body (raw JSON):
    ```json
        {
            "name": "Local Electric Company (Updated)",
            "accountNumber": "ELEC00123",
            "typicalDueDay": 26,
            "website": "http://updated.localelectric.com",
            "contactInfo": "555-987-6543"
        }
    ```
- Delete Organization (DELETE):
  - URL: http://localhost:3001/organizations/1
  - Method: DELETE

You now have a fully functional Organization Service containerized and connected to a persistent MySQL database!

### mysql schema for users

The bill_tracker_db includes a `users` table for the "Users Service" microservice will be responsible for user registration, login, and managing user profiles. It uses Node.js with Express to integrate secure password handling with JWT-based authentication.


 Running and Testing the Secured Backend and Frontend

    Rebuild and Restart Backend Services:
    From your project root (where docker-compose.yml is), run:
    Bash

docker compose up --build -d

This will rebuild the organization-service image with the updated code and restart its container.

Verify Backend Logs:
Check the logs for organization-service:
Bash

docker compose logs -f organization-service

Ensure it starts without errors.

Start React Frontend (if not already running):
In a separate terminal, navigate to my-bill-tracker-frontend and run:
Bash

    npm run dev

Test Flow:

    Login: Open your browser to the frontend (http://localhost:5173/). You should be redirected to the login page. Log in with your registered testuser credentials.

    Dashboard - Empty State (for new users):

        If you log in with a new user (i.e., one that did not implicitly create organizations when user_id was hardcoded to 1), you should now see an empty list of organizations on the dashboard. This confirms the service is now filtering by the actual user_id.

    Add Organization: Go to "Add Organization". Fill in details for a new organization and submit.

        It should add successfully. Return to the dashboard. You should now see only this new organization (and any others you create for this specific user).

    Logout and Login with Another User:

        Create a new user account via the "Register" page.

        Logout from the first user, and then log in with this new user.

        You should see an empty list of organizations again, demonstrating that the data is now strictly segregated by user_id. The organizations created by testuser are not visible to this new user.

    Test API Directly (Optional - Postman/Curl):

        Try fetching organizations from http://localhost:3001/organizations without an Authorization: Bearer <token> header. You should get a 401 Unauthorized response.

        Try with a valid token from testuser. You should see testuser's organizations.

        Try with a valid token from your second user. You should see the second user's organizations (or an empty array).

Congratulations! Your Organization Service is now securely integrated with the User Service, and data access is correctly restricted to the authenticated user.

Next, we should tackle the Bill Payment Service to start tracking actual monthly bills and update the dashboard. How does that sound?


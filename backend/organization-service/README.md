# The Organization Service

Thus service will manage your billing organization details, and set up the MySQL database.

For the backend microservices, Node.js with Express.js is used. This combination is lightweight, fast, and excellent for building RESTful APIs, fitting well into a microservices architecture.

Node.js Express application for the Organization Service
- express: Web framework.
- mysql2: MySQL client for Node.js (better performance than mysql).
- dotenv: For loading environment variables from a .env file.
- cors: For handling Cross-Origin Resource Sharing, essential for frontend-backend communication.


1. integrate org service with jwt

jwt import: const jwt = require('jsonwebtoken');

jwtSecret: Retrieved from environment variables: const jwtSecret = process.env.JWT_SECRET;

authenticateToken middleware: This new function is responsible for:

    Extracting the JWT from the Authorization: Bearer <token> header.

    Verifying the token using jwt.verify() and your jwtSecret.

    If valid, it attaches the decoded user payload (which contains id and username) to req.user.

    If invalid, it sends a 401 or 403 response.

app.use('/organizations', authenticateToken);: This line applies the authenticateToken middleware to all routes under /organizations. Any request to these endpoints will now first go through this middleware.

const user_id = req.user.id;: In every CRUD operation, the hardcoded user_id = 1 is replaced with req.user.id, ensuring that actions are performed only for the currently authenticated user.

SQL Queries: All queries now include WHERE user_id = ? conditions to restrict data access and modification to the logged-in user.

2. env 

JWT_SECRET to the Organization Service's .env file. It must be the exact same secret key as used in the User Service.

backend/organization-service/.env

When developing this app, perform the following only after completing the build, run, test steps in 1) [./backend/db/README.md](../backend/db/README.md), and 2) [./backend/user-service/README.md](../backend/user-service/README.md).

3. compose


```
docker compose up --build -d
```

to check logs
```
docker compose logs -f organization-service
#You should see Organization Service running on port 3001 and Connected to MySQL database!
```

## Testing the API Endpoints

Use `curl` to test the Organization Service APIs. Perform Test 1 of the [user-service README.md](../backend/user-service/README.md) to generate a user account password before moving on to other services. You'll need it's password when testing the API endpoints.

The base URL for your Organization Service will be http://localhost:3001.

- Add Organization (POST):
  - URL: http://localhost:3001/organizations
  - Method: POST
  - Headers: `Content-Type: application/json`
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
  - Ex:
    ```
    DATA='{ "name": "Local Electric Co.", "accountNumber": "ELEC00123", "typicalDueDay": 25, "website": "http://localelectric.com", "contactInfo": "555-123-4567"}'
    curl -X PUT http://localhost:3001/organizations -H 'Content-Type: application/json' -H "Authorization: Bearer $TOKEN" -d "$DATA"
    {"message":"Organization added successfully","organizationId":5,"organization":{"id":5,"name":"Local Electric Company (Updated)","accountNumber":"ELEC00123","typicalDueDay":26,"website":"http://updated.localelectric.com","contactInfo":"555-987-6543","user_id":1}}
    ```
- Get All Organizations (GET):
  - URL: http://localhost:3001/organizations
  - Method: GET
  - Ex:
    ```
    curl -s http://localhost:3001/organizations -H "Authorization: Bearer $TOKEN" | jq
    [
        {
            "id": 1,
            "name": "Dominion Energy",
            "accountNumber": "1234567890",
            "typicalDueDay": 20,
            "website": "https://dominionenergy.com",
            "contactInfo": "1-800-POWER"
        },
        {
            "id": 2,
            "name": "Fairfax Water",
            "accountNumber": "FVW987654",
            "typicalDueDay": 15,
            "website": "https://fairfaxwater.org",
            "contactInfo": "703-698-5800"
        },
        {
            "id": 3,
            "name": "Verizon Fios",
            "accountNumber": "VZFIOS112233",
            "typicalDueDay": 1,
            "website": "https://verizon.com/fios",
            "contactInfo": "1-800-VERIZON"
        }
    ]
    ```
- Get Single Organization (GET):
  - URL: http://localhost:3001/organizations/1 (replace 1 with an actual ID from your database or a POST response)
  - Method: GET
  - Ex:
    ```
    curl -X GET http://localhost:3001/organizations/1 -H 'Content-Type: application/json
    ' -H "Authorization: Bearer $TOKEN" 
    {"id":1,"name":"Dominion Energy","accountNumber":"1234567890","typicalDueDay":20,"website":"https://dominionenergy.com","contactInfo":"1-800-POWER"}
    ```
- Update Organization (PUT):
  - URL: http://localhost:3001/organizations/1
  - Method: PUT
  - Headers: `Content-Type: application/json`
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
  - Ex:
    ```
    DATA='{"name": "Local Electric Company (Updated)","accountNumber": "ELEC00123", "typicalDueDay": 26,"website": "http://updated.localelectric.com","contactInfo": "555-987-6543"}'
    curl -X PUT -s http://localhost:3001/organizations/5 -H 'Content-Type: application/json' -H "Authorization: Bearer $TOKEN" -d "$DATA" | jq
    {
    "message": "Organization updated successfully."
    }
    ```
- Delete Organization (DELETE):
  - URL: http://localhost:3001/organizations/1
  - Method: DELETE
  - Ex
    ```
     curl -X DELETE -s http://localhost:3001/organizations/5 -H 'Content-Type: application/json' -H "Authorization: Bearer $TOKEN" | jq
    {
    "message": "Organization deleted successfully."
    }
    ```

You now have a fully functional Organization Service containerized and connected to a persistent MySQL database!


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





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

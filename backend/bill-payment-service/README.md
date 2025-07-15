# Bill Payment Service

The Bill Payment Service  allows users to:
- Add new bill entries associated with an organization.
- View upcoming and past bill payments.
- Update bill details (e.g., amount due, due date).
- Record a payment for a specific bill, marking it as paid and storing payment details.

This service design follows the same patterns as each of the other app services: database schema, service setup, API endpoints, and Dockerization.

1. MySQL Schema for Bills

We need two new tables for bill payments: bills (for recurring bill entries) and payments (for individual payment records).

the db-init.sql script will also add the bill_tracker_db and execute the following SQL.

- bills table: Stores information about the type of bill (e.g., "Electricity Bill" from "Dominion Energy"). It's a recurring concept.

payments table: Stores specific instances of a bill (e.g., "Dominion Energy bill for July 2025, due July 20, amount $120, paid July 18"). This is where actual payment records are kept.

Foreign Keys: We establish relationships between users, organizations, and these new tables. ON DELETE CASCADE means if a user or organization is deleted, their associated bills and payments are also deleted. ON DELETE SET NULL for bill_id in payments ensures that if a recurring bill is deleted, the individual payment records associated with it aren't lost, just disassociated from the recurring entry.

2. Bill Payment Service Microservice Setup

- folder: backend/bill-payment-service
- l2 dotenv cors jsonwebtoken

3. Configuration (.env file)

- .env file in backend/bill-payment-service
- backend/bill-payment-service/.env

4. Bill Payment Service Code

- main application file: backend/bill-payment-service/server.js

5.  Dockerize the Bill Payment Service

- Dockerfile in backend/bill-payment-service
    - backend/bill-payment-service/Dockerfile

6. Update docker-compose.yml

- Bill Payment Service defined in docker-compose.yml.
  - docker-compose.yml (updated with bill-payment-service)


## Run and Test the Bill Payment Service

Make sure to have first completed the backend/db, backend/user-service, backend/organizations-service README.md build/test instructions before starting these.

1. Rebuild and Restart All Backend Services:
2. From your project root (where docker-compose.yml is), run the following to rebuild the bill-payment-service image and restart all services.
   ```
   ./billtracker$ docker compose -f my-bill-tracker/docker-compose.yaml up --build -d
   ```
3. Verify Backend Logs to confirm it starts without errors by checking the logs for bill-payment-service:
     ```
     ./billtracker$ docker logs -f bill-tracker-bill-payment-service
     ```
4. Test the API Endpoints (using Postman/Insomnia/curl):

The base URL for the Bill Payment Service is http://localhost:3002. Remember to include the `Authorization: Bearer <YOUR_JWT_TOKEN>` header for all requests (get your token by logging in via the frontend or using the User Service /login endpoint).

Bills (Recurring Entries)

- Add Bill (POST):
  - URL: http://localhost:3002/bills
  - Method: POST
  - Headers: Content-Type: application/json, Authorization: Bearer YOUR_TOKEN
  - Body (JSON):
    ```json
    {
        "organizationId": 1,        // Use an ID from an organization you have created for your user
        "billName": "Electricity Bill",
        "dueDay": 20,
        "typicalAmount": 150.75,
        "frequency": "monthly",
        "notes": "Covers lights and heating"
    }
    ```
  - Ex
    ```sh
    USER='{ "username": "testuser", "email": "test@example.com", "password": "password123" }'
    TOKEN=$(curl -s http://localhost:3000/login -X POST -d "$USER" -H 'Content-Type: application/json' | jq -r .token)
    DATA='{ "organizationId": 1, "billName": "Electricity Bill", "dueDay": 20, "typicalAmount": 150.75, "frequency": "monthly", "notes": "Covers lights and heating" }'
    curl http://localhost:3002/bills -X POST -d "$DATA" -H 'Content-Type: application/json' -H "Authorization: Bearer $TOKEN"  | jq
    % Total    % Received % Xferd  Average Speed   Time    Time     Time  Current
                                    Dload  Upload   Total   Spent    Left  Speed
    100   368  100   212  100   156   3424   2520 --:--:-- --:--:-- --:--:--  5935
    {
        "message": "Bill entry added successfully",
        "billId": 1,
        "bill": {
            "id": 1,
            "organizationId": 1,
            "billName": "Electricity Bill",
            "dueDay": 20,
            "typicalAmount": 150.75,
            "frequency": "monthly",
            "notes": "Covers lights and heating"
        }
    }
    ```
- Get All Bills (GET):
  - URL: http://localhost:3002/bills
  - Method: GET
  - Headers: Authorization: Bearer YOUR_TOKEN
  - Ex:
    ```sh
    $ curl -s http://localhost:3002/bills -H "Authorization: Bearer $TOKEN" | jq
    [
        {
            "id": 1,
            "billName": "Electricity Bill",
            "dueDay": 20,
            "typicalAmount": "150.75",
            "frequency": "monthly",
            "notes": "Covers lights and heating",
            "isActive": 1,
            "organizationId": 1,
            "organizationName": "Dominion Energy"
        }
    ]
    ```
- Get Single Bill (GET):
  - URL: http://localhost:3002/bills/1 (replace 1 with an actual bill ID)
  - Method: GET
  - Headers: Authorization: Bearer YOUR_TOKEN
  - Ex,
    ```sh
    $ curl -s http://localhost:3002/bills/1 -H "Authorization: Bearer $TOKEN" | jq
    {
        "id": 1,
        "billName": "Electricity Bill",
        "dueDay": 20,
        "typicalAmount": "150.75",
        "frequency": "monthly",
        "notes": "Covers lights and heating",
        "isActive": 1,
        "organizationId": 1,
        "organizationName": "Dominion Energy"
    }
    ```
- Update Bill (PUT):
  - URL: http://localhost:3002/bills/1
  - Method: PUT
  - Headers: Content-Type: application/json, Authorization: Bearer YOUR_TOKEN
  - Body (JSON - example update):
    ```json
    {
        "organizationId": 1,
        "billName": "Electricity Bill",
        "dueDay": 25,
        "typicalAmount": 160.00,
        "frequency": "monthly",
        "notes": "Covers lights and heating (updated)",
        "isActive": true
    }
    ```
  - Ex,
    ```sh
    $ DATA='{ "organizationId": 1, "billName": "Electricity Bill", "dueDay": 20, "typicalAmount": "150.75", "frequency": "monthly", "notes": "Covers lights and heating", "isActive": 1 }'
    $ curl http://localhost:3002/bills/1 -X PUT -d "$DATA" -H 'Content-Type: application/json' -H "Authorization: Bearer $TOKEN"
    {"message":"Bill entry updated successfully."
    ```
- Delete Bill (DELETE):
  - URL: http://localhost:3002/bills/1
  - Method: DELETE
  - Headers: Authorization: Bearer YOUR_TOKEN
  - Ex
    ```sh
    $ curl http://localhost:3002/bills/1 -H "Authorization: Bearer $TOKEN"  -X DELETE
    {"message":"Bill entry deleted successfully."}
    ```
- Payments (Individual Records)
  - Record Payment (POST):
  - URL: http://localhost:3002/payments
  - Method: POST
  - Headers: Content-Type: application/json, Authorization: Bearer YOUR_TOKEN
  - Body (JSON): (You can either link it to a billId or just organizationId if it's a one-off payment)
    ```jason
    {
        "billId": 1,             // Optional, if linked to a recurring bill entry
        "organizationId": 1,     // Required
        "dueDate": "2025-07-20",
        "amountDue": 150.75,
        "datePaid": "2025-07-18",
        "paymentConfirmationCode": "CONF123456",
        "amountPaid": 150.75,
        "notes": "Paid online via bank transfer"
    }
    ```
  - Ex
    ```sh
    DATA='{ "billId": 1, "organizationId": 1, "dueDate": "2025-07-20", "amountDue": 150.75, "datePaid": "2025-07-18", "paymentConfirmationCode": "CONF123456", "amountPaid": 150.75, "notes": "Paid online via bank transfer" }'

    ```
Get Upcoming Payments (GET):

    URL: http://localhost:3002/payments/upcoming

    Method: GET

    Headers: Authorization: Bearer YOUR_TOKEN

Get Recently Paid Payments (GET):

    URL: http://localhost:3002/payments/recently-paid

    Method: GET

    Headers: Authorization: Bearer YOUR_TOKEN

Get Single Payment (GET):

    URL: http://localhost:3002/payments/1 (replace 1 with an actual payment ID)

    Method: GET

    Headers: Authorization: Bearer YOUR_TOKEN

Update Payment (PUT):

    URL: http://localhost:3002/payments/1

    Method: PUT

    Headers: Content-Type: application/json, Authorization: Bearer YOUR_TOKEN

    Body (JSON - example update):
    JSON

        {
            "billId": 1,
            "organizationId": 1,
            "dueDate": "2025-07-20",
            "amountDue": 150.75,
            "datePaid": "2025-07-18",
            "paymentConfirmationCode": "CONF123456-UPDATED",
            "amountPaid": 150.75,
            "notes": "Paid online via bank transfer (updated)",
            "paymentStatus": "paid"
        }

    Delete Payment (DELETE):

        URL: http://localhost:3002/payments/1

        Method: DELETE

        Headers: Authorization: Bearer YOUR_TOKEN

You now have a robust Bill Payment Service. The next logical step is to integrate this service with your React frontend, especially the Dashboard and Record Payment Form, to bring the bill tracking functionality to life.

Are you ready to integrate the Bill Payment Service with the frontend?
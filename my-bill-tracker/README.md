# Containerized App

This folder contains a docker-compose.yaml file that can be used to deploy a local containerized instance of the BillTracker application for development purposes.

1. Build & Run

To build the containers, clone this repo locally and run these commands from its the top level directory
```
git clone git@github.com:thesystemninjaneer/billtracker.git
cd billtracker
docker compose -f my-bill-tracker/docker-compose.yaml up --build -d 
```

2. Access

Browse to http://localhost:8080 or change the CORS_ALLOWED_ORIGINS & API_GATEWAY_URL to the container host IP when remotely developing. Otherwise, set them to the Apps FQDN when deploying a production version.

3. Test

Perform any of the test examples outlined in each services README.md files.

1. Backend services
   1. [db](../backend/db/README.md)
   2. [user-service](../backend/user-service/README.md)
   3. [organization-service](../backend/organization-service/README.md)
   4. [bill-payment-service](../backend/bill-payment-service/README.md)
   5. notification (TODO)
2. [Frontend](../my-bill-tracker-frontend/README.md) service
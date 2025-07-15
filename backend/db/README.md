# MySQL Database Setup

First, a MySQL database is needed for data persistence. These instructions use docker-compose to manage the billtracker services during development. Here is a list of the relevant backend database service items.

- image: mysql:8.0: Uses the official MySQL 8.0 Docker image.
- environment: Sets up the root password, the default database (bill_tracker_db), and a dedicated user (bill_user) with a password. Make sure to change these passwords to strong, secure ones!
- ports: "3306:3306": Maps the container's 3306 port (MySQL default) to your host machine's 3306 port, allowing you to connect from outside the container.
- volumes: db_data:/var/lib/mysql: This creates a named volume to persist your database data. Even if the container is removed, your data will remain.
- healthcheck: Ensures the database container is fully ready before other services try to connect.

To manually connect to the database using a mysql client and setup the schema/tables, do the following.
```
$ docker exec -ti bill-tracker-mysql bash
bash-5.1# mysql -u bill_user -p
Enter password:
use bill_tracker_db;
SHOW TABLES;
```
When prompted, paste in the database password (default: `your_db_password`). After logged in, paste in the contents of [db-init.sql](db-init.sql) to perform the one time initialization of the databases app required tables. 

Continue on to manually run and test the service locally. This is handy when your development/contributing work needs validated.

## Run the db service

Example command to run the services:
```
./billtracker$ docker compose -f my-bill-tracker/docker-compose.yaml up --build -d
```


### mysql schema for users

The bill_tracker_db includes a `users` table for the "Users Service" microservice. It is responsible for user registration, login, and managing user profiles. The database service leverages Node.js with Express to integrate secure password handling with JWT-based authentication.


 Running and Testing the Secured Backend and Frontend

    Rebuild and Restart Backend Services:
    From your project root (where docker-compose.yml is), run:
    Bash

docker compose up --build -d

To setup the next most relevant service, follow the [user-service README.md](../user-service/README.md).






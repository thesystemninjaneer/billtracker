FROM docker.io/mysql:8.0

ENV MYSQL_ROOT_PASSWOR=your_strong_root_password
ENV MYSQL_DATABASE=bill_tracker_db
ENV MYSQL_USER=bill_user
ENV MYSQL_PASSWORD=your_db_password

COPY db-init.sql /docker-entrypoint-initdb.d
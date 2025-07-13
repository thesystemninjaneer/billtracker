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

3. compose


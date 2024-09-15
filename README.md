# 2FA Backend

This repository contains the backend of a Two-Factor Authentication (2FA) application. It provides the necessary API endpoints for handling user authentication, registration, and two-factor authentication (2FA) setup and verification.

## Features

- User registration and login system with secure password hashing.
- Support for time-based one-time passwords (TOTP) for 2FA.
- 2FA setup with QR code generation for scanning.
- 2FA token verification with secure integration.
- Middleware for protecting routes that require 2FA verification.
- JWT (JSON Web Tokens) for user authentication.

## Technologies

This project uses the following technologies:

- **Node.js**: A JavaScript runtime built on Chrome's V8 engine.
- **Express.js**: A web framework for Node.js.
- **MongoDB**: A NoSQL database used to store user information.
- **Mongoose**: An Object Data Modeling (ODM) library for MongoDB and Node.js.
- **Speakeasy**: For generating and verifying TOTP codes for 2FA.
- **jsonwebtoken (JWT)**: For generating and verifying authentication tokens.
- **bcrypt.js**: For hashing passwords.

## Prerequisites

Before you begin, ensure you have met the following requirements:

- **Node.js** and **npm** should be installed on your machine. You can download Node.js [here](https://nodejs.org/).
- **MongoDB** should be installed or you should have access to a MongoDB instance.

## Installation

Follow these steps to set up the project locally:

1. Clone the repository:

   ```bash
   git clone https://github.com/barmor12/2FABackend.git
   ```

2. Navigate to the project directory:

   ```bash
   cd 2FABackend
   ```

3. Install the dependencies:

   ```bash
   npm install
   ```

4. Create a `.env` file in the root of the project and add your environment variables:

   ```plaintext
   MONGO_URI=<your_mongo_db_connection_string>
   JWT_SECRET=<your_jwt_secret>
   ```

5. Start the server:

   ```bash
   npm start
   ```

The backend should now be running on [http://localhost:5000](http://localhost:5000).

## Usage

Once the backend is running, you can use the following API endpoints:

- **POST** `/api/auth/register`: Register a new user.
- **POST** `/api/auth/login`: Log in with a username and password.
- **POST** `/api/auth/2fa/setup`: Set up 2FA and get a QR code for scanning.
- **POST** `/api/auth/2fa/verify`: Verify the 2FA token.
- **POST** `/api/auth/2fa/disable`: Disable 2FA for a user.

## Folder Structure

- **models/**: Contains Mongoose models for the database.
  - **User.js**: The schema and model for storing user data.
- **routes/**: Contains Express routes for handling API requests.
  - **auth.js**: Routes related to authentication and 2FA.
- **middleware/**: Contains middleware for route protection.
  - **auth.js**: Middleware that verifies JWT and 2FA status.
- **server.js**: The main entry point for the backend server.

## Security Enhancements

- **JWT Authentication**: Secure authentication using JWTs for maintaining user sessions.
- **Password Hashing**: Passwords are hashed using bcrypt.js to ensure they are stored securely.
- **2FA**: Adds an extra layer of security using time-based one-time passwords (TOTP).

## Contributing

Contributions are welcome! To contribute:

1. Fork this repository.
2. Create a new branch (`git checkout -b feature-branch`).
3. Make your changes and commit them (`git commit -m 'Add some feature'`).
4. Push to the branch (`git push origin feature-branch`).
5. Open a pull request.

## License

This project is licensed under the MIT License. See the `LICENSE` file for details.

## Contact

If you have any questions or feedback, feel free to reach out to me:

- GitHub: [barmor12](https://github.com/barmor12)

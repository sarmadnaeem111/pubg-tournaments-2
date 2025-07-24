# PUBG Tournaments Web Application

A web application for managing PUBG tournaments, allowing users to join tournaments and administrators to manage tournaments, users, and results.

## Features

- User authentication and authorization with email/password and Google login
- Tournament management (create, edit, delete)
- Tournament registration for users
- User wallet system for entry fees
- Tournament status management (upcoming, live, completed)
- Tournament result image uploads via Cloudinary
- Admin dashboard for managing tournaments and users
- Secure authentication with CSRF protection

## Setup and Installation

### Prerequisites

- Node.js and npm
- Firebase account
- Cloudinary account

### Installation

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Create a `.env` file based on `.env.example` and fill in your Firebase and Cloudinary credentials
4. Enable Google Authentication in Firebase Console:
   - Go to Firebase Console > Authentication > Sign-in method
   - Enable Google as a sign-in provider
   - Configure the OAuth consent screen in Google Cloud Console
   - Add your domain to the authorized domains list
5. Start the development server:
   ```
   npm start
   ```

## Environment Variables

Copy the `.env.example` file to a new file named `.env` and fill in the following variables:

```
# Firebase Configuration
REACT_APP_FIREBASE_API_KEY=your_firebase_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
REACT_APP_FIREBASE_PROJECT_ID=your_firebase_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
REACT_APP_FIREBASE_APP_ID=your_firebase_app_id

# Cloudinary Configuration
REACT_APP_CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
REACT_APP_CLOUDINARY_API_KEY=your_cloudinary_api_key
REACT_APP_CLOUDINARY_API_SECRET=your_cloudinary_api_secret
REACT_APP_CLOUDINARY_UPLOAD_PRESET=your_cloudinary_upload_preset
```

## Cloudinary Setup

1. Create a Cloudinary account at [https://cloudinary.com/](https://cloudinary.com/)
2. Get your Cloud Name, API Key, and API Secret from the Cloudinary Dashboard
3. Create an upload preset in the Cloudinary Dashboard:
   - Go to Settings > Upload
   - Scroll down to Upload presets and click "Add upload preset"
   - Set the preset to "Unsigned" for client-side uploads
   - Configure any desired transformations or restrictions
   - Save the preset name for use in the `.env` file

## Security Measures

- All user inputs are sanitized using DOMPurify
- Cloudinary upload widget is configured with secure settings
- Image URLs are sanitized before storing in the database
- Upload preset is restricted to image files only
- Maximum file size is limited to 5MB
- Secure HTTPS connections are enforced for all Cloudinary operations

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.

### `npm test`

Launches the test runner in the interactive watch mode.

### `npm run build`

Builds the app for production to the `build` folder.

### `npm run security-audit`

Runs a security audit on the codebase to identify potential vulnerabilities.

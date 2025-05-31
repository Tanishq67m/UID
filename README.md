# Captivate Compose Connect

## Project Structure

- `client/` – Frontend (React, Vite, TypeScript, Tailwind CSS)
- `server/` – Backend (Node.js, Express, OAuth, OpenAI, LinkedIn, Twitter)

---

## Getting Started

### Prerequisites
- Node.js (v18+ recommended)
- npm (comes with Node.js)

---

## Setup Instructions

### 1. Clone the repository
```sh
git clone <YOUR_GIT_URL>
cd captivate-compose-connect
```

### 2. Install dependencies
#### Client
```sh
cd client
npm install
```
#### Server
```sh
cd ../server
npm install
```

---

### 3. Environment Variables

The server requires a `.env` file. See `server/.env.example` for all required variables:

- `GITHUB_TOKEN` – GitHub Personal Access Token for AI model
- `TWITTER_CLIENT_ID` – Twitter OAuth Client ID
- `TWITTER_REDIRECT_URI` – Twitter OAuth Redirect URI
- `LINKEDIN_CLIENT_ID` – LinkedIn OAuth Client ID
- `LINKEDIN_REDIRECT_URI` – LinkedIn OAuth Redirect URI
- `PORT` – (Optional) Port for the server (default: 3000)

Copy the example file and fill in your values:
```sh
cp server/.env.example server/.env
# Edit server/.env with your credentials
```

---

### 4. Running the Apps

#### Start the server
```sh
cd server
npm start
```

#### Start the client (in a new terminal)
```sh
cd client
npm run dev
```

- Client: http://localhost:5173 (or as shown in terminal)
- Server: http://localhost:3000 (or as set in your .env)

---

## OAuth Setup
- Register your app with Twitter and LinkedIn to obtain the required client IDs and redirect URIs.
- Set these values in your `.env` file as described above.

---

## Technologies Used
- React, Vite, TypeScript, Tailwind CSS, shadcn-ui (Client)
- Node.js, Express, OpenAI, OAuth, Mongoose (Server)

---

## License
MIT 
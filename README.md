
# GTMarketPlace (https://gtmarketplace.org)

GTMarketPlace is a web application designed for the Georgia Tech community to buy, sell, and trade items securely within the campus network. The platform provides a safe and user-friendly environment for students, faculty, and staff to connect and manage listings, messages, and transactions.

## Features

- **User Authentication**: Secure login with OAuth (Google) and password reset functionality.
- **Listings**: Create, browse, and manage item listings with images and descriptions.
- **Messaging**: In-app messaging system for buyers and sellers to communicate.
- **Profile Management**: View and edit user profiles, purchase history, and recent activity.
- **AI Price Suggestion**: Get price suggestions for listings using a machine learning model.
- **Campus Map**: Visualize item locations and meet-up spots on a campus map.
- **Responsive UI**: Modern, mobile-friendly interface built with React and TypeScript.

## Tech Stack

- **Frontend**: React, TypeScript, Vite
- **Backend**: Node.js (Express), Python (AI price suggestion to be implemented with more data)
- **Authentication**: Firebase Auth, Google OAuth
- **Database**: Firebase Firestore
- **AI/ML**: Python (see `ai_price_suggestion/`)

## Getting Started

### Prerequisites
- Node.js (v18+ recommended)
- npm or yarn
- Python 3.10+ (for AI price suggestion)

### Installation
1. Clone the repository:
   ```sh
   git clone https://github.com/SohamGunturu7/GTMarketPlace.git
   cd GTMarketPlace
   ```
2. Install frontend dependencies:
   ```sh
   npm install
   # or
   yarn install
   ```
3. Set up Firebase:
   - Add your Firebase config to `src/firebase/config.ts`.
   - Place your Google OAuth client secret in the project root as `client_secret_...json`.
4. (Optional) Set up the AI price suggestion service:
   - Navigate to `ai_price_suggestion/` and install Python dependencies:
     ```sh
     pip install -r requirements.txt
     ```
   - Run the Python service as needed.

### Running the App
Start the development server:
```sh
npm run dev
# or

```
The app will be available at `http://localhost:5173` by default.

## Folder Structure

- `src/` - React frontend source code and also firebase logic
- `ai_price_suggestion/` - Python ML model for price suggestions
- `public/` - Static assets and images
- `server.js` - Node.js backend server (if used)

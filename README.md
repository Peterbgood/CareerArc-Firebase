CareerArc | Job Search Tracker
A high-performance, minimalist React + Firebase dashboard designed to track job applications with zero friction. Built with a focus on speed, mobile responsiveness, and clean typography.

⚡ Features
Real-time Sync: Powered by Firebase Firestore for instant updates across devices.

Smart Filtering: One-tap filtering via the Summary Cards (Interviewing, Ghosted, Remote, etc.).

Responsive Design:

Desktop: 6-column high-density grid.

Mobile: 2-column stacked grid for easy thumb-tapping.

Security: PIN-protected access to keep your search data private.

Pagination: Smooth handling of large application volumes (25 per page).

Clean UI: Tailwind CSS implementation with a "Utility-First" aesthetic.

🛠️ Tech Stack
Framework: React (TypeScript)

Styling: Tailwind CSS

Database: Firebase Firestore

Icons: Heroicons (SVG)

🚀 Getting Started
1. Prerequisites
Node.js installed.

A Firebase project set up at console.firebase.google.com.

2. Installation
Bash
# Clone the repository
git clone https://github.com/yourusername/career-arc.git

# Install dependencies
npm install

# Start the development server
npm run dev
3. Environment Setup
The current configuration uses a direct firebaseConfig object within App.tsx. For production, it is recommended to move these to a .env file:

Code snippet
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
📂 Project Structure
App.tsx: Main application logic, Firebase integration, and UI components.

Summary Cards: Dynamic calculation of job statuses using useMemo.

Job List: Conditional rendering for different status badges (Green for Interviewing, Red for Rejected, etc.).

Modal System: Unified form for adding and editing job records.

📝 Usage Tips
Resetting: Use the "Reset" button to clear all search terms and status filters simultaneously.

Direct Links: Click the external link icon next to a job title to jump straight to the original posting.

PIN Access: The default access PIN is set to 3270 (Change this in the APP_PIN constant).

⚖️ License
MIT License - Feel free to use this to land your next big role!

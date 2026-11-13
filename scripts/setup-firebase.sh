# Firebase Project Setup Script
# Run this after creating a Firebase project in the console

# 1. Create Firestore Database
npx firebase firestore:databases:create --region=us-central1

# 2. Create Realtime Database
npx firebase database:instances:create --region=us-central1

# 3. Deploy Security Rules
npx firebase deploy --only firestore:rules
npx firebase deploy --only database

# 4. Enable Anonymous Auth
# Go to Firebase Console > Authentication > Sign-in method > Anonymous

# 5. Enable Email/Password Auth
# Go to Firebase Console > Authentication > Sign-in method > Email/Password

# 6. Enable Google Auth
# Go to Firebase Console > Authentication > Sign-in method > Google

# 7. Get Web Config
# Go to Firebase Console > Project Settings > General > Your apps > Web app
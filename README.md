# Zaya AI — Kiran's Futuristic Voice Assistant

Complete voice-first web app using Node.js, Socket.IO, Google GenAI JavaScript SDK, and Gemini Live.

## Run
1. Copy `.env.example` to `.env`.
2. Add your Gemini API key to `GEMINI_API_KEY`.
3. Run `npm install`.
4. Run `npm start`.
5. Open `http://localhost:8000`.
6. Allow microphone access.
7. Tap the orb and speak.

## Architecture
Browser microphone -> Socket.IO -> Node server -> Gemini Live
Gemini audio -> Node server -> Socket.IO -> Browser audio

The API key stays on the server and is not shipped to `public/`.

## Browser limitations
A normal web page cannot guarantee unrestricted microphone access or wake-word listening after the page is completely closed or suspended. The app therefore uses explicit microphone activation.

Browsers also cannot silently access a phone's private contacts database. Calls, mail, and WhatsApp actions are opened through supported browser/OS interfaces and still require the user's confirmation where applicable.

## Security
Never commit `.env` and never put the Gemini API key in frontend JavaScript.

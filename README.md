# ChatNao

## Project overview
ChatNao is a real-time doctor and patient communication workspace that rewrites messages for clarity, supports audio notes, and keeps searchable conversation history.

## Features attempted and completed
- Email and password login/signup with hashed storage
- Doctor discovery and patient chat initiation
- Doctor view of active clients and chat list
- Real-time chat with LLM-assisted message rewriting
- Audio recording, upload, and playback in the chat thread
- Conversation search within an active chat
- AI-generated conversation summaries

## Tech stack used
- Next.js App Router
- Convex for database, realtime queries, and storage
- Tailwind CSS and shadcn/ui components
- Google Generative AI (Gemini) for message rewriting and summaries

## AI tools and resources leveraged
- Gemini 2.5 Flash for clarity rewrites and chat summaries
- GPT-5.2-Codex and Claude Opus 4.5 for coding

## Test accounts
- Doctor: Dr. Maya Patel (Cardiology). Email: maya.patel@chatnao.test. Password: Test1234!
- Doctor: Dr. Lucas Chen (Pediatrics). Email: lucas.chen@chatnao.test. Password: Test1234!
- Patient: Aisha Bello (recent chest tightness). Email: aisha.bello@chatnao.test. Password: Test1234!
- Patient: Marco Ruiz (knee pain after soccer). Email: marco.ruiz@chatnao.test. Password: Test1234!

## Known limitations, trade-offs, or unfinished parts
- No role-based access enforcement beyond client checks
- No persistent user session beyond local storage
- No global search across all chats yet
- Audio transcription is not implemented

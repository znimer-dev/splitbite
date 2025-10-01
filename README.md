# 🍽️ SplitBite

**AI-powered receipt splitting that actually works.** Upload a receipt photo, let AI extract the items, and split costs instantly with friends.

## 🚀 [Live Demo](#)
*Link will be updated once deployed*

## What I Built

I developed SplitBite as a full-stack solution to solve the annoying problem of splitting restaurant bills. Instead of manually calculating who ordered what, users simply snap a photo and let AI handle the heavy lifting.

**Key Features:**
- 📱 **Smart Receipt Scanning** - AWS Textract + OpenAI for accurate item extraction
- 👥 **Effortless Bill Splitting** - Assign items to people, auto-calculate totals with tax/tip
- 🔐 **Secure User System** - JWT authentication with bcrypt password hashing
- 📊 **Receipt History** - Track spending patterns and restaurant visits
- ⚡ **Real-time Processing** - Instant receipt parsing and split calculations

## Tech Stack

**Frontend:** Vanilla JavaScript, HTML5, CSS3 (responsive design)
**Backend:** Node.js, TypeScript, Express.js
**Database:** MongoDB with Mongoose ODM
**AI/ML:** AWS Textract (OCR), OpenAI GPT-4 (text parsing)
**Storage:** AWS S3 for receipt images
**Auth:** JWT tokens with secure session management

## Architecture Highlights

- **Microservices approach** with separate services for S3, Textract, OpenAI, and split calculations
- **Robust error handling** with fallback parsing when AI services fail
- **RESTful API design** with proper HTTP status codes and validation
- **Environment-based configuration** for seamless dev/prod deployment
- **Scalable file storage** with signed URLs for secure image access

## Quick Start

```bash
git clone https://github.com/znimer-dev/splitbite.git
cd splitbite/backend
npm install
npm run dev
# Visit http://localhost:5000
```

## Key Implementation Details

**AI Processing Pipeline:**
1. AWS Textract extracts raw text from receipt images
2. OpenAI GPT-4 intelligently parses text into structured data
3. Custom algorithms handle tax/tip distribution and splitting logic
4. Fallback to regex-based parsing if AI services fail

**Database Design:**
- User authentication with salted password hashing
- Receipt documents with embedded item arrays and split calculations
- Restaurant history tracking for spending analytics
- Optimized queries with proper indexing

**Security Features:**
- Input validation and sanitization
- Rate limiting and file upload restrictions
- Secure environment variable management
- CORS configuration for cross-origin requests

## Why I Built This

Splitting bills manually is tedious and error-prone. I wanted to create something that "just works" - snap a photo, get accurate results instantly. The challenge was building a robust AI pipeline that handles real-world receipt variations while maintaining fast performance.

## What's Next

- Mobile app development (React Native)
- Integration with payment platforms (Venmo, PayPal)
- Group expense tracking and analytics
- Multi-language receipt support

---

**Built by:** Zaid Nimri
**Contact:** [Your Email/LinkedIn]
**Portfolio:** [Your Portfolio Link]
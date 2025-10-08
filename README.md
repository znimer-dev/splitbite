# 🍽️ SplitBite

**Smart receipt splitting that actually works.** Upload a receipt photo, automatically extract items, and split costs instantly with friends.

## 🚀 [Live Demo](https://splitbite-0e7k.onrender.com/)

## What I Built

I developed SplitBite as a full-stack solution to solve the annoying problem of splitting restaurant bills. Instead of manually calculating who ordered what, users simply snap a photo and get instant, accurate item extraction and cost splitting.

**Key Features:**
- 📱 **Automated Receipt Scanning** - OCR technology for accurate item extraction
- 👥 **Effortless Bill Splitting** - Assign items to people, auto-calculate totals with tax/tip
- 🔐 **Secure User System** - JWT authentication with bcrypt password hashing
- 📊 **Receipt History** - Track spending patterns and restaurant visits
- ⚡ **Real-time Processing** - Instant receipt parsing and split calculations

## Tech Stack

**Frontend:** TypeScript, HTML5, CSS3 (responsive design)
**Backend:** Node.js, TypeScript, Express.js
**Database:** MongoDB with Mongoose ODM
**Processing:** AWS Textract (OCR), OpenAI (text parsing)
**Storage:** AWS S3 for receipt images
**Auth:** JWT tokens with secure session management

## Architecture Highlights

- **Service-oriented design** with separate modules for S3, OCR, text parsing, and split calculations
- **Robust error handling** with fallback parsing when cloud services fail
- **RESTful API design** with proper HTTP status codes and input validation
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

**Receipt Processing Pipeline:**
1. AWS Textract extracts raw text from receipt images
2. OpenAI parses text into structured data (restaurant, items, prices)
3. Custom algorithms handle tax/tip distribution and splitting logic
4. Fallback to regex-based parsing for reliability

**Database Design:**
- User authentication with salted password hashing
- Receipt documents with embedded item arrays and split calculations
- Restaurant history tracking for spending analytics
- Database indexing for optimized queries

**Security & Infrastructure:**
- File upload restrictions (type and size validation)
- Secure environment variable management
- CORS configuration for cross-origin requests
- Input validation on all API endpoints

## Why I Built This

Splitting bills manually is tedious and error-prone. I wanted to create something that's seamless, snap a photo, get accurate results instantly. Not only that, but this is my first true full stack project, a big challenge was learning as I was going, and debugging problems I've never encountered before.

## What's Next

- Mobile app development (React Native)
- Integration with payment platforms (Venmo, PayPal)
- More Splitting Options
- Group expense tracking and analytics
- Multi-language receipt support
- Enhanced OCR accuracy improvements

---

**Built by:** Zaid Nimer

**Contact:** [z.nimer@outlook.com]

**Portfolio:** [https://www.linkedin.com/in/zaid-nimer/]

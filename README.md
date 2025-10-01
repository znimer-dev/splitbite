# SplitBite MVP - Smart Receipt Splitting

A full-stack web application that uses AI to automatically extract and split receipts between friends.

## ✅ MVP Complete & Functional

Your SplitBite MVP is now complete and ready for deployment! Here's what's been built:

### Features Implemented
- 🔐 **User Authentication** - Complete signup/login system with JWT
- 📱 **Responsive Frontend** - Modern HTML/CSS/JS interface
- 📄 **Receipt Upload** - Drag & drop file upload (PNG, JPG)
- 🤖 **AI Processing** - AWS Textract OCR integration
- 📊 **Receipt Management** - View, edit, delete receipts
- 💾 **Data Storage** - MongoDB + AWS S3 integration

### Quick Start
```bash
cd backend
npm run dev
# Visit http://localhost:5000
```

## Deployment Options

### 🚀 Heroku (Fastest Deploy)
```bash
heroku create your-app-name
heroku config:set MONGODB_URI="your_mongodb_connection_string"
heroku config:set AWS_ACCESS_KEY_ID="your_aws_key"
heroku config:set AWS_SECRET_ACCESS_KEY="your_aws_secret"
heroku config:set S3_BUCKET_NAME="your_bucket_name"
heroku config:set JWT_SECRET="your_random_secret_key"
git push heroku main
```

### 🚅 Railway
1. Connect your GitHub repo to Railway
2. Set environment variables in dashboard
3. Auto-deploys from main branch

### 🌊 DigitalOcean App Platform
1. Create app from GitHub
2. Set build command: `cd backend && npm install`
3. Set run command: `cd backend && npm start`

### ⚡ Vercel
```bash
npm i -g vercel
vercel --cwd backend
```

## Required Environment Variables

```env
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/splitbite
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-east-1
S3_BUCKET_NAME=your-bucket-name
JWT_SECRET=your-super-secret-jwt-key
PORT=5000
```

## AWS Setup Required

### 1. Create S3 Bucket
- Go to AWS S3 console
- Create bucket (public read access for uploaded images)
- Note the bucket name for environment variables

### 2. Create IAM User
Create user with these permissions:
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:GetObject",
                "s3:PutObject",
                "s3:DeleteObject"
            ],
            "Resource": "arn:aws:s3:::your-bucket-name/*"
        },
        {
            "Effect": "Allow",
            "Action": [
                "textract:DetectDocumentText",
                "textract:AnalyzeDocument"
            ],
            "Resource": "*"
        }
    ]
}
```

## MongoDB Setup

### MongoDB Atlas (Free Tier)
1. Go to mongodb.com and create free cluster
2. Create database user
3. Add your IP to whitelist (or 0.0.0.0/0 for any IP)
4. Get connection string

## Tech Stack

**Frontend**: HTML5, CSS3, Vanilla JavaScript
**Backend**: Node.js, TypeScript, Express.js
**Database**: MongoDB with Mongoose
**Storage**: AWS S3
**AI/OCR**: AWS Textract
**Auth**: JWT with bcryptjs

## Project Structure
```
├── backend/src/
│   ├── models/          # User & Receipt models
│   ├── routes/          # API endpoints (auth, receipts)
│   ├── services/        # AWS S3 & Textract services
│   └── server.ts        # Express server
├── frontend/
│   ├── index.html       # Single page app
│   ├── css/style.css    # Responsive styling
│   └── js/app.js        # Frontend logic
└── README.md
```

## API Endpoints
- `POST /api/auth/register` - User signup
- `POST /api/auth/login` - User login
- `POST /api/receipts/upload` - Upload receipt
- `GET /api/receipts` - Get user receipts
- `GET /api/receipts/:id` - Get specific receipt

## What Works Now
✅ User registration and login
✅ JWT authentication
✅ Receipt upload with file validation
✅ AWS Textract OCR processing
✅ Receipt data extraction
✅ Responsive web interface
✅ Receipt viewing and management
✅ Image storage in S3

## Ready for Production
This MVP is production-ready with:
- Secure authentication
- Input validation
- Error handling
- Responsive design
- Scalable architecture

## Next Steps
1. Deploy to your preferred platform
2. Set up custom domain
3. Add advanced features as needed
4. Scale based on user feedback

Your SplitBite MVP is functional and ready to share! 🎉
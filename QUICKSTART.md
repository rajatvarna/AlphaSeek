# 🚀 AlphaSeek Quick Start Guide

## ✅ Application is Running!

Both servers are active and ready to use:

### 🌐 Access URLs
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000/api
- **Health Check**: http://localhost:5000/api/health

### 🔐 Login Credentials
- **Username**: `admin`
- **Password**: `admin123`

---

## 📱 How to Use AlphaSeek

### 1️⃣ Login to the Application
1. Open http://localhost:3000 in your browser
2. Enter username: `admin` and password: `admin123`
3. Click "Login"
4. You'll see the main dashboard with the "Admin" badge

### 2️⃣ Add Your First Stock Idea
1. Click the **"+ Add Idea"** button in the top-right
2. Fill in the form:
   - **Ticker**: NVDA
   - **Company Name**: NVIDIA Corporation
   - **Source**: Reddit r/wallstreetbets
   - **Source Type**: Reddit
   - **Original Link**: https://reddit.com/r/wallstreetbets/example
   - **Entry Price**: 500.00
   - **Conviction**: High
   - **Summary**: AI chip leader with strong growth
   - **Thesis**: NVIDIA dominates the AI/GPU market with 80%+ market share. Strong data center revenue growth driven by AI demand.
   - **Tags**: AI, Semiconductors, Growth
3. Click **"Add Idea"**
4. Watch the idea appear in your dashboard!

### 3️⃣ Explore the Features

#### View Ideas
- **Search**: Type ticker, company name, or keywords
- **Filter by Source**: All, Hedge Fund, Reddit, Blog, etc.
- **Filter by Tags**: Click tag filters
- **View Details**: Click on any idea card

#### Analytics Dashboard
1. Click **"Analytics"** in the header
2. See portfolio statistics:
   - Total ideas and returns
   - Win rate
   - Best/worst performers
   - Performance by source
   - Performance by timeframe (1W, 1M, 6M, YTD, 1Y, 3Y, 5Y)

#### Dark Mode 🌙
1. Click the **Moon icon** in the header
2. Entire app switches to dark theme
3. Click **Sun icon** to switch back
4. Preference is saved automatically!

---

## 🧪 Testing Sprint 4 Features

### Feature 1: Fundamental Data

Get stock fundamentals via API:

```bash
# Set your token
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTc2NDc1OTc3NywiZXhwIjoxNzY1MzY0NTc3fQ.TgwwWYR3dAjdhwL0C2MCvYN8-PyDsrSiN6rNO-t7ajQ"

# Get NVIDIA fundamentals
curl -H "Authorization: Bearer $TOKEN" http://localhost:5000/api/fundamentals/NVDA

# Try other tickers
curl -H "Authorization: Bearer $TOKEN" http://localhost:5000/api/fundamentals/TSLA
curl -H "Authorization: Bearer $TOKEN" http://localhost:5000/api/fundamentals/AAPL
```

Expected output includes:
- Market cap (formatted as T/B/M)
- P/E ratio
- EPS
- Volume
- 52-week high/low
- Dividend yield
- Beta
- Sector & Industry

### Feature 2: Comments & Reactions

Add a comment to an idea:

```bash
# Create a comment
curl -X POST http://localhost:5000/api/comments \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "ideaId": "1",
    "content": "Great analysis! I am bullish on this stock."
  }'

# Get comments for an idea
curl -H "Authorization: Bearer $TOKEN" http://localhost:5000/api/comments/idea/1

# Add a bullish reaction
curl -X POST http://localhost:5000/api/comments/reactions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "ideaId": "1",
    "reactionType": "bullish"
  }'

# Get reactions summary
curl -H "Authorization: Bearer $TOKEN" http://localhost:5000/api/comments/reactions/idea/1
```

### Feature 3: Price Alerts

Create a price alert:

```bash
# Alert when NVDA reaches $600
curl -X POST http://localhost:5000/api/alerts \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "ideaId": "1",
    "alertType": "price_target",
    "threshold": 600.00
  }'

# Get all your alerts
curl -H "Authorization: Bearer $TOKEN" http://localhost:5000/api/alerts
```

Alert types:
- `price_target`: Alert at specific price
- `percent_change`: Alert at % change
- `trailing_stop`: Alert at % drop from peak

### Feature 4: Data Export

Export your ideas:

```bash
# Export to CSV
curl -H "Authorization: Bearer $TOKEN" http://localhost:5000/api/export/csv -o ideas.csv

# Export to JSON
curl -H "Authorization: Bearer $TOKEN" http://localhost:5000/api/export/json -o ideas.json
```

---

## 🤖 Background Jobs Status

These jobs run automatically:

| Job | Schedule | Status |
|-----|----------|--------|
| **Price Updates** | Every 15 min (market hours) | ✅ Active |
| **Pre-market Update** | 9:00 AM ET (Mon-Fri) | ✅ Scheduled |
| **Post-market Update** | 4:15 PM ET (Mon-Fri) | ✅ Scheduled |
| **Alert Checker** | Every 5 minutes | ✅ Active |
| **Reddit Scraper** | Every 6 hours | ✅ Active |
| **Daily Backup** | 2:00 AM daily | ✅ Scheduled |

Monitor logs in the terminal where servers are running.

---

## 📊 Database Structure

AlphaSeek uses SQLite with the following tables:

- **users**: User accounts with roles
- **stock_ideas**: All stock ideas with performance tracking
- **tags**: Available tags
- **idea_tags**: Junction table for many-to-many tags
- **comments**: Threaded comments on ideas
- **reactions**: User reactions (bullish/bearish/watching)
- **mentions**: @mention tracking
- **price_alerts**: User-configured price alerts
- **fundamentals_cache**: 24-hour cache for stock fundamentals
- **scraped_ideas**: Reddit-scraped ideas pending approval

View database:
```bash
sqlite3 backend/database.db
.tables
SELECT * FROM users;
```

---

## 🎨 UI Features

### Main Dashboard
- Sticky header with navigation
- Search bar with real-time filtering
- Source type filters (All, Hedge Fund, Reddit, etc.)
- Tag filters
- View mode toggle (Ideas vs Analytics)
- Dark mode toggle
- User info with admin badge

### Idea Cards
- Ticker and company name
- Entry price and current price
- Return percentage (color-coded)
- Conviction level badge
- Tags
- Summary preview
- External link icon

### Analytics View
- Portfolio statistics cards
- Best/worst performers
- Performance breakdowns
- Win rate visualization
- Timeframe performance grid

### Dark Mode
- Complete theme switching
- Persistent across sessions
- Smooth transitions
- All components styled

---

## 🔧 Development Commands

```bash
# Start both servers
npm run dev:all

# Start frontend only
npm run dev

# Start backend only
npm run dev:server

# Build for production
npm run build

# Run production server
npm start
```

---

## 📝 What's Implemented

### Core Platform
✅ SQLite database with full schema
✅ JWT authentication & authorization
✅ Admin vs user roles
✅ Stock ideas CRUD operations
✅ Yahoo Finance integration
✅ Performance tracking (1W to 5Y)
✅ Tag system
✅ Search and filtering

### Sprint 2: Advanced Features
✅ Portfolio analytics dashboard
✅ Real-time price updates (background job)
✅ Idea status lifecycle (Active, Watching, Exited, etc.)
✅ Price alerts system
✅ Data backup & recovery

### Sprint 3: Enhanced Features
✅ Reddit auto-scraper with sentiment analysis
✅ CSV/JSON export
✅ Enhanced data model (watchlist vs portfolio)
✅ Advanced filtering

### Sprint 4: Latest Features
✅ Fundamental data integration
✅ Comments & discussion system
✅ Email notification system
✅ Dark mode toggle

---

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Kill process on port 5000
kill -9 $(lsof -ti:5000)

# Kill process on port 3000
kill -9 $(lsof -ti:3000)

# Restart servers
npm run dev:all
```

### Database Issues
```bash
# Reset database (WARNING: Deletes all data)
rm backend/database.db
npm run dev:server
# Database will be recreated with default admin user
```

### API Token Expired
If you get 401 errors, login again to get a fresh token:
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

### Email Service Not Working
This is expected in Claude Code environment. In production:
1. Set environment variables:
   ```
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-app-password
   ```
2. Restart server
3. Emails will be sent when alerts trigger

---

## 🚀 Next Steps

1. **Add Sample Data**: Create 5-10 stock ideas to test analytics
2. **Test All Features**: Follow TESTING.md checklist
3. **Customize**: Modify colors, add your logo
4. **Deploy**:
   - Frontend: Vercel/Netlify
   - Backend: Railway/Render/DigitalOcean
5. **Configure Production**:
   - Set SMTP credentials
   - Add Reddit API keys
   - Set JWT secret
6. **Monitor**: Add Sentry or LogRocket
7. **Backup**: Set up automated database backups

---

## 📚 Documentation

- **Full Testing Guide**: See `TESTING.md`
- **TODO Features**: See `TODO.md`
- **API Documentation**: All endpoints documented in `TESTING.md`

---

## 💡 Tips

1. **Use Dark Mode**: Perfect for night-time market research
2. **Add Tags**: Organize ideas by sector, strategy, risk level
3. **Set Alerts**: Never miss price targets
4. **Export Data**: Regular backups via CSV/JSON
5. **Check Analytics**: Review performance weekly
6. **Reddit Scraper**: Check pending ideas daily for new opportunities

---

## 🎉 You're All Set!

AlphaSeek is fully operational and ready to track your stock ideas.

**Start here**: http://localhost:3000

Happy investing! 📈

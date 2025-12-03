# AlphaSeek Testing Guide

## Quick Start
1. **Access the app**: http://localhost:3000
2. **Login** with default credentials:
   - Username: `admin`
   - Password: `admin123`

## Test Plan

### Phase 1: Authentication & Basic UI ✓
- [ ] Login page displays correctly
- [ ] Login with admin credentials works
- [ ] User role displays as "Admin" badge in header
- [ ] Logout functionality works

### Phase 2: Core Features (Sprints 1-3)

#### Ideas Management
- [ ] **Add New Idea** (Admin only)
  - Click "+ Add Idea" button
  - Fill in ticker (e.g., NVDA, TSLA, AAPL)
  - Add company name, source, conviction
  - Submit and verify idea appears in list

- [ ] **Search & Filter**
  - Use search bar to find ideas by ticker/company
  - Filter by source type (All, Hedge Fund, Reddit, etc.)
  - Filter by tags

- [ ] **Idea Cards**
  - Verify ticker, company name display
  - Check entry price and current price
  - View performance metrics (return %)
  - Click "View Details" to see thesis and summary

#### Analytics Dashboard
- [ ] Click "Analytics" tab in header
- [ ] Verify portfolio statistics:
  - Total ideas count
  - Total return %
  - Win rate
  - Average return
- [ ] Check best/worst performers
- [ ] Review performance by source
- [ ] Review performance by conviction level
- [ ] Check performance by timeframe (1W, 1M, 6M, YTD, 1Y, 3Y, 5Y)

#### Data Export
- [ ] Test CSV export from API: `GET http://localhost:5000/api/export/csv`
- [ ] Test JSON export from API: `GET http://localhost:5000/api/export/json`
- [ ] Verify exported data includes all fields and calculated returns

### Phase 3: Sprint 4 Features (NEW!)

#### 1. Fundamental Data Integration
**API Endpoint**: `GET /api/fundamentals/:ticker`

Test with curl:
```bash
# Get fundamentals for NVDA
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:5000/api/fundamentals/NVDA
```

Expected response:
```json
{
  "ticker": "NVDA",
  "marketCap": "3.4T",
  "marketCapRaw": 3400000000000,
  "peRatio": "68.50",
  "eps": "$2.15",
  "volume": "245M",
  "week52High": "$152.00",
  "week52Low": "$45.00",
  "dividendYield": "0.03%",
  "beta": "1.25",
  "sector": "Technology",
  "industry": "Semiconductors"
}
```

- [ ] Test with different tickers (AAPL, TSLA, MSFT, GOOGL)
- [ ] Verify caching (second request should be faster)
- [ ] Check formatting (T/B/M for market cap, B/M/K for volume)

#### 2. Comments & Discussion System
**API Endpoints**:
- `GET /api/comments/idea/:ideaId` - Get comments for an idea
- `POST /api/comments` - Create a comment
- `PATCH /api/comments/:id` - Edit a comment
- `DELETE /api/comments/:id` - Delete a comment

Test creating a comment:
```bash
curl -X POST http://localhost:5000/api/comments \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "ideaId": "1",
    "content": "Great analysis! I agree with the bullish thesis on this stock."
  }'
```

Test nested replies:
```bash
curl -X POST http://localhost:5000/api/comments \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "ideaId": "1",
    "content": "Thanks! What do you think about the valuation?",
    "parentId": 1
  }'
```

**Reactions API**:
- `POST /api/comments/reactions` - Add reaction (bullish/bearish/watching)
- `GET /api/comments/reactions/idea/:ideaId` - Get reactions for idea
- `DELETE /api/comments/reactions/idea/:ideaId` - Remove reaction

Test reactions:
```bash
# Add bullish reaction
curl -X POST http://localhost:5000/api/comments/reactions \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "ideaId": "1",
    "reactionType": "bullish"
  }'

# Get reaction summary
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/comments/reactions/idea/1
```

**@Mentions**:
- [ ] Create comment with @username
- [ ] Verify mention is saved in mentions table
- [ ] Check mentions for user: `GET /api/comments/mentions/me`

**Test Checklist**:
- [ ] Create top-level comment
- [ ] Create nested reply (thread)
- [ ] Edit own comment (verify "edited" flag)
- [ ] Delete own comment
- [ ] Admin can delete any comment
- [ ] Add bullish reaction to idea
- [ ] Change reaction from bullish to bearish
- [ ] Remove reaction
- [ ] View reaction summary (counts)
- [ ] Test @mention in comment
- [ ] Verify threaded structure (parent-child relationships)

#### 3. Email Notification System
**API Endpoints**:
- `POST /api/alerts` - Create price alert
- `GET /api/alerts` - Get user's alerts
- `PATCH /api/alerts/:id` - Update alert
- `DELETE /api/alerts/:id` - Delete alert

Create a price alert:
```bash
curl -X POST http://localhost:5000/api/alerts \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "ideaId": "1",
    "alertType": "price_target",
    "threshold": 150.00
  }'
```

Alert types:
- `price_target`: Alert when price reaches specific value
- `percent_change`: Alert when price changes by X%
- `trailing_stop`: Alert when price drops X% from peak

**Background Job**: Alert checker runs every 5 minutes

**Test Checklist**:
- [ ] Create price target alert
- [ ] Create percent change alert (e.g., 10%)
- [ ] Create trailing stop alert (e.g., 5%)
- [ ] Wait 5 minutes for alert checker to run
- [ ] Check backend logs for alert checks
- [ ] Verify email would be sent (check console logs)
- [ ] Alert deactivates after triggering (price_target only)

**Note**: Email delivery is disabled in this environment due to network restrictions, but the system is fully implemented and will work in production.

#### 4. Dark Mode Toggle
**Test Checklist**:
- [ ] Click Moon icon in header
- [ ] Verify entire UI switches to dark theme:
  - Background changes to dark gray
  - Text becomes white/light gray
  - Cards have dark background
  - Buttons adapt to dark theme
  - Search input dark styled
  - Header/filters dark styled
- [ ] Click Sun icon to switch back to light mode
- [ ] Refresh page - verify preference persists (localStorage)
- [ ] Toggle multiple times - verify smooth transitions

**Visual Elements to Check**:
- Header background (glass effect)
- Main background color
- Card backgrounds
- Button colors and hover states
- Text contrast (readability)
- Search input styling
- Filter buttons
- View mode toggle (Ideas/Analytics)
- User badge

### Phase 4: Background Jobs

Monitor the console logs to verify:

**Price Updates**:
- [ ] Initial price update runs on startup (after 10 seconds)
- [ ] During market hours (Mon-Fri 9:30 AM - 4:00 PM ET): Updates every 15 min
- [ ] Pre-market update at 9:00 AM ET
- [ ] Post-market update at 4:15 PM ET

**Alert Checker**:
- [ ] Runs every 5 minutes
- [ ] Checks all active alerts
- [ ] Logs triggered alerts

**Reddit Scraper**:
- [ ] Runs every 6 hours
- [ ] Scrapes 5 subreddits (wallstreetbets, stocks, investing, StockMarket, ValueInvesting)
- [ ] Extracts tickers with $TICKER format
- [ ] Analyzes sentiment (bullish/bearish/neutral)
- [ ] Saves to scraped_ideas table for admin approval

**Daily Backup**:
- [ ] Runs at 2:00 AM
- [ ] Creates backup in `backend/backups/`
- [ ] Keeps last 7 backups

### Phase 5: API Testing

Get authentication token:
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

Save the token and use it for authenticated requests:
```bash
TOKEN="your_token_here"
```

#### Test All Endpoints

**Ideas**:
```bash
# Get all ideas
curl -H "Authorization: Bearer $TOKEN" http://localhost:5000/api/ideas

# Get single idea
curl -H "Authorization: Bearer $TOKEN" http://localhost:5000/api/ideas/1

# Create idea (admin only)
curl -X POST http://localhost:5000/api/ideas \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "ticker": "TSLA",
    "companyName": "Tesla Inc",
    "source": "Reddit r/stocks",
    "sourceType": "Reddit",
    "originalLink": "https://reddit.com/r/stocks/example",
    "entryDate": "2025-12-03",
    "entryPrice": 250.00,
    "conviction": "High",
    "summary": "EV leader with strong growth potential",
    "thesis": "Tesla dominates the EV market...",
    "tags": ["EV", "Growth", "Technology"]
  }'

# Update idea status
curl -X PATCH http://localhost:5000/api/ideas/1/status \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "Active"
  }'

# Delete idea (admin only)
curl -X DELETE http://localhost:5000/api/ideas/1 \
  -H "Authorization: Bearer $TOKEN"
```

**Stocks**:
```bash
# Get stock data with history
curl -H "Authorization: Bearer $TOKEN" http://localhost:5000/api/stocks/NVDA
```

**Export**:
```bash
# Export to CSV
curl -H "Authorization: Bearer $TOKEN" http://localhost:5000/api/export/csv

# Export to JSON
curl -H "Authorization: Bearer $TOKEN" http://localhost:5000/api/export/json
```

**Scraper** (Admin only):
```bash
# Get pending scraped ideas
curl -H "Authorization: Bearer $TOKEN" http://localhost:5000/api/scraper/pending

# Trigger manual scrape
curl -X POST http://localhost:5000/api/scraper/scrape \
  -H "Authorization: Bearer $TOKEN"

# Approve scraped idea
curl -X POST http://localhost:5000/api/scraper/approve/1 \
  -H "Authorization: Bearer $TOKEN"

# Get scraper stats
curl -H "Authorization: Bearer $TOKEN" http://localhost:5000/api/scraper/stats
```

**Batch Operations** (Admin only):
```bash
# Manual price update
curl -X POST http://localhost:5000/api/batch/update-prices \
  -H "Authorization: Bearer $TOKEN"

# Check update status
curl -H "Authorization: Bearer $TOKEN" http://localhost:5000/api/batch/update-status
```

**Health Check** (No auth required):
```bash
curl http://localhost:5000/api/health
```

## Performance Testing

### Response Times
- [ ] API responses under 200ms for cached data
- [ ] Initial stock data fetch under 2s
- [ ] Fundamentals cache hit under 50ms
- [ ] Comments load under 100ms

### Concurrency
- [ ] Multiple users can login simultaneously
- [ ] Parallel API requests handled correctly
- [ ] Database locks prevent race conditions

### Caching
- [ ] Fundamental data cached for 24 hours
- [ ] Second request for same ticker is instant
- [ ] Cache invalidation works correctly

## Security Testing

- [ ] Unauthenticated requests rejected (401)
- [ ] Non-admin users can't create/delete ideas (403)
- [ ] JWT tokens expire correctly
- [ ] SQL injection prevented (parameterized queries)
- [ ] XSS prevention in comments
- [ ] Password hashing (bcrypt)

## Browser Compatibility

Test in multiple browsers:
- [ ] Chrome/Edge (Chromium)
- [ ] Firefox
- [ ] Safari
- [ ] Mobile browsers (responsive design)

## Database Verification

Check SQLite database:
```bash
sqlite3 backend/database.db

# View tables
.tables

# Check users
SELECT * FROM users;

# Check ideas
SELECT * FROM stock_ideas;

# Check comments
SELECT * FROM comments;

# Check reactions
SELECT * FROM reactions;

# Check fundamentals cache
SELECT * FROM fundamentals_cache;

# Check alerts
SELECT * FROM price_alerts;
```

## Log Monitoring

Monitor server logs for:
- [ ] No error stack traces
- [ ] Successful job completions
- [ ] API request logging
- [ ] Database operations
- [ ] Background job status

## Known Limitations

1. **Email Service**: Disabled in this environment due to network restrictions. In production, configure SMTP credentials via environment variables:
   ```
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-app-password
   SMTP_FROM="AlphaSeek <noreply@alphaseek.app>"
   ```

2. **Reddit Scraper**: Requires Reddit API credentials. Set in environment:
   ```
   REDDIT_CLIENT_ID=your-client-id
   REDDIT_CLIENT_SECRET=your-client-secret
   REDDIT_USER_AGENT=AlphaSeek/1.0
   ```

3. **Yahoo Finance**: Uses public API with proxy rotation. May rate limit with heavy usage.

## Success Criteria

✅ All core features functional
✅ All Sprint 4 features operational
✅ Dark mode works perfectly
✅ API endpoints respond correctly
✅ Background jobs execute on schedule
✅ Database operations successful
✅ No critical errors in logs
✅ UI responsive and professional

## Next Steps

After testing, consider:
1. Deploy to production (Vercel, Railway, or DigitalOcean)
2. Configure production SMTP for email alerts
3. Set up Reddit API credentials for scraper
4. Add monitoring (Sentry, LogRocket)
5. Set up CI/CD pipeline
6. Create user documentation
7. Implement remaining TODO features

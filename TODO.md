# AlphaSeek - Feature Development Roadmap

## 🔥 HIGH PRIORITY - Maximum Impact

### ✅ COMPLETED
- [x] Database persistence with SQLite
- [x] Backend API with Express.js
- [x] JWT authentication and role-based access control
- [x] 3Y and 5Y performance timeframes
- [x] Yahoo Finance integration with caching

### 🚧 IN PROGRESS

### 📋 TODO - High Priority

#### 1. Portfolio Analytics Dashboard
**Priority:** P0 - Critical
**Effort:** Medium (2-3 days)
**Value:** High

Features:
- [ ] Portfolio summary component showing aggregate stats
- [ ] Total portfolio return calculation
- [ ] Win/loss ratio metrics
- [ ] Best/worst performer cards
- [ ] Performance breakdown by source type
- [ ] Performance breakdown by time period
- [ ] Sharpe ratio calculation
- [ ] Sector exposure analysis
- [ ] Risk metrics display

**Files to create:**
- `components/PortfolioDashboard.tsx`
- `components/PortfolioSummary.tsx`
- `components/PerformanceChart.tsx`
- `services/analyticsService.ts`

---

#### 2. Real-Time Price Updates & Background Jobs
**Priority:** P0 - Critical
**Effort:** Medium (2-3 days)
**Value:** High

Features:
- [ ] Background job scheduler using node-cron
- [ ] Update all stock prices every 15 minutes during market hours
- [ ] Batch price update API endpoint
- [ ] Price change notifications
- [ ] Last updated timestamp display
- [ ] Auto-refresh toggle in UI

**Files to create:**
- `backend/jobs/scheduler.js`
- `backend/jobs/priceUpdateJob.js`
- `backend/routes/batch.js`

**Dependencies to add:**
- `node-cron`

---

#### 3. Reddit Auto-Scraper
**Priority:** P0 - Critical
**Effort:** High (3-4 days)
**Value:** Very High

Features:
- [ ] Reddit API integration (free tier)
- [ ] Scrape r/wallstreetbets, r/stocks, r/investing
- [ ] Ticker extraction from posts/comments
- [ ] Sentiment analysis (local, no paid AI)
- [ ] Admin approval queue
- [ ] Scheduled scraping jobs (every 6 hours)
- [ ] Duplicate detection
- [ ] Source attribution with Reddit links

**Files to create:**
- `backend/services/scrapers/redditScraper.js`
- `backend/services/scrapers/tickerExtractor.js`
- `backend/services/scrapers/sentimentAnalyzer.js`
- `backend/routes/scraper.js`
- `backend/models/scrapedIdea.js`
- `components/ApprovalQueue.tsx`

**Dependencies to add:**
- `snoowrap` (Reddit API wrapper)
- `sentiment` (sentiment analysis)

---

#### 4. Price Alerts System
**Priority:** P1 - High
**Effort:** Medium (2-3 days)
**Value:** High

Features:
- [ ] Create price_alerts table in database
- [ ] API endpoints for managing alerts
- [ ] Alert types: price target, percent change, earnings
- [ ] Email notifications using SendGrid/Nodemailer
- [ ] Browser push notifications
- [ ] Alert history tracking
- [ ] Alert management UI
- [ ] Background job to check alerts

**Files to create:**
- `backend/models/alerts.js`
- `backend/routes/alerts.js`
- `backend/jobs/alertChecker.js`
- `backend/services/emailService.js`
- `components/AlertManager.tsx`
- `components/CreateAlert.tsx`

**Database schema:**
```sql
CREATE TABLE price_alerts (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL,
  stock_idea_id INTEGER NOT NULL,
  alert_type TEXT NOT NULL,
  threshold REAL,
  triggered BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (stock_idea_id) REFERENCES stock_ideas(id)
);
```

**Dependencies to add:**
- `nodemailer`

---

#### 5. Idea Status Lifecycle
**Priority:** P1 - High
**Effort:** Low (1-2 days)
**Value:** High

Features:
- [ ] Add status fields to stock_ideas table
- [ ] Status options: Active, Watching, Exited (Win/Loss), Stopped Out, Archived, Invalidated
- [ ] Exit tracking (date, price, reason, actual return)
- [ ] Status change UI in idea cards
- [ ] Status filtering
- [ ] Historical performance tracking
- [ ] Win/loss analytics
- [ ] Average hold time calculation

**Database schema:**
```sql
ALTER TABLE stock_ideas ADD COLUMN status TEXT DEFAULT 'Active';
ALTER TABLE stock_ideas ADD COLUMN exit_date TEXT;
ALTER TABLE stock_ideas ADD COLUMN exit_price REAL;
ALTER TABLE stock_ideas ADD COLUMN exit_reason TEXT;
ALTER TABLE stock_ideas ADD COLUMN actual_return REAL;
```

**Files to update:**
- `backend/database.js` (schema migration)
- `backend/routes/ideas.js` (add status endpoints)
- `components/IdeaCard.tsx` (add status badge)
- `components/IdeaStatusModal.tsx` (new)
- `types.ts` (add status types)

---

## 💪 MEDIUM PRIORITY - Strong Value Add

#### 6. Comments & Discussion System
**Priority:** P2 - Medium
**Effort:** High (4-5 days)
**Value:** Medium

Features:
- [ ] Comments table and API
- [ ] Threaded comment support
- [ ] Reactions (Bullish/Bearish/Watching)
- [ ] @mentions support
- [ ] Markdown support in comments
- [ ] Comment voting/helpfulness
- [ ] Real-time comment updates
- [ ] Comment notifications

**Database schema:**
```sql
CREATE TABLE comments (
  id INTEGER PRIMARY KEY,
  stock_idea_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  parent_comment_id INTEGER,
  content TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (stock_idea_id) REFERENCES stock_ideas(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (parent_comment_id) REFERENCES comments(id) ON DELETE CASCADE
);

CREATE TABLE idea_reactions (
  id INTEGER PRIMARY KEY,
  stock_idea_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  reaction_type TEXT NOT NULL,
  UNIQUE(stock_idea_id, user_id),
  FOREIGN KEY (stock_idea_id) REFERENCES stock_ideas(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

---

#### 7. Fundamental Data Integration
**Priority:** P2 - Medium
**Effort:** Medium (2-3 days)
**Value:** High

Features:
- [ ] Integrate Yahoo Finance fundamental data
- [ ] Display: Market cap, P/E, EPS, volume, 52w high/low
- [ ] Earnings calendar integration
- [ ] SEC filings links
- [ ] Fundamental data cards in idea view
- [ ] Caching for fundamental data

**Files to create:**
- `backend/services/fundamentalsService.js`
- `backend/routes/fundamentals.js`
- `components/FundamentalsCard.tsx`

---

#### 8. Export & Reporting
**Priority:** P2 - Medium
**Effort:** Medium (2-3 days)
**Value:** Medium

Features:
- [ ] Export to CSV/Excel
- [ ] Export to PDF with charts
- [ ] Google Sheets integration
- [ ] JSON API export
- [ ] Weekly/monthly email reports
- [ ] Custom report builder

**Files to create:**
- `backend/services/exportService.js`
- `backend/routes/export.js`
- `backend/services/reportService.js`

**Dependencies to add:**
- `json2csv`
- `pdfkit`

---

#### 9. Watchlist vs Portfolio Separation
**Priority:** P2 - Medium
**Effort:** Low (1-2 days)
**Value:** Medium

Features:
- [ ] Position status field (watching/invested/exited)
- [ ] Position size tracking
- [ ] Cost basis calculation
- [ ] Separate tabs for Watchlist vs Portfolio
- [ ] True P&L calculation
- [ ] Position sizing recommendations
- [ ] Risk management metrics

**Database schema:**
```sql
ALTER TABLE stock_ideas ADD COLUMN position_status TEXT DEFAULT 'watching';
ALTER TABLE stock_ideas ADD COLUMN position_size REAL;
ALTER TABLE stock_ideas ADD COLUMN cost_basis REAL;
```

---

#### 10. Enhanced Filtering & Smart Search
**Priority:** P2 - Medium
**Effort:** Medium (2-3 days)
**Value:** High

Features:
- [ ] Full-text search on thesis content
- [ ] Search by performance range
- [ ] Search by conviction level
- [ ] Search by date range
- [ ] Boolean tag logic (AND/OR/NOT)
- [ ] Saved search queries
- [ ] Advanced sort options
- [ ] Search history

**Files to create:**
- `components/AdvancedSearch.tsx`
- `components/SavedSearches.tsx`
- `backend/routes/search.js`

---

## 🎯 NICE TO HAVE - Polish & UX

#### 11. Dark Mode
**Priority:** P3 - Low
**Effort:** Low (1 day)
**Value:** Low

Features:
- [ ] Dark theme CSS variables
- [ ] Toggle in header
- [ ] Save preference to localStorage
- [ ] Auto-switch based on system preference
- [ ] Smooth theme transition

---

#### 12. Customizable Dashboard
**Priority:** P3 - Low
**Effort:** High (3-4 days)
**Value:** Medium

Features:
- [ ] Drag-and-drop widgets
- [ ] User preferences for default view
- [ ] Custom columns in table view
- [ ] Save multiple layouts
- [ ] Personal notes on ideas

**Dependencies to add:**
- `react-grid-layout`

---

#### 13. Mobile PWA
**Priority:** P3 - Low
**Effort:** Medium (2-3 days)
**Value:** Medium

Features:
- [ ] PWA manifest
- [ ] Service worker for offline support
- [ ] Add to home screen
- [ ] Push notifications
- [ ] Swipe gestures
- [ ] Mobile-optimized compact view

---

#### 14. Batch Operations (Admin)
**Priority:** P3 - Low
**Effort:** Low (1 day)
**Value:** Low

Features:
- [ ] Multi-select checkbox on ideas
- [ ] Bulk price update
- [ ] Bulk change source type
- [ ] Bulk add tags
- [ ] Bulk archive
- [ ] Bulk export

---

#### 15. Idea Comparison Tool
**Priority:** P3 - Low
**Effort:** Medium (2 days)
**Value:** Medium

Features:
- [ ] Side-by-side comparison view
- [ ] Compare up to 5 ideas
- [ ] Compare performance metrics
- [ ] Compare fundamentals
- [ ] Export comparison

**Files to create:**
- `components/ComparisonView.tsx`
- `components/ComparisonTable.tsx`

---

#### 16. Local AI Features (No Paid APIs)
**Priority:** P3 - Low
**Effort:** Medium (2-3 days)
**Value:** Medium

Features:
- [ ] Sentiment analysis using sentiment.js
- [ ] Thesis summarization using compromise.js
- [ ] Ticker extraction with regex
- [ ] Related ideas detection (TF-IDF)
- [ ] Duplicate detection

**Dependencies to add:**
- `sentiment`
- `compromise`
- `natural` (NLP library)

---

## 🛠️ TECHNICAL IMPROVEMENTS

#### 17. Background Job System
**Priority:** P1 - High (part of feature #2)
**Effort:** Medium
**Value:** High

Features:
- [ ] Cron job scheduler
- [ ] Price updates every 15 min (market hours)
- [ ] Daily Reddit scraping
- [ ] Weekly email reports
- [ ] Monthly cache cleanup
- [ ] Job status monitoring
- [ ] Job logs

**Dependencies to add:**
- `node-cron`

---

#### 18. API Rate Limiting & Advanced Caching
**Priority:** P2 - Medium
**Effort:** Low (1 day)
**Value:** High

Features:
- [ ] Rate limiter middleware
- [ ] Redis caching (optional)
- [ ] In-memory cache with TTL
- [ ] Cache invalidation strategies
- [ ] Rate limit by user role

**Dependencies to add:**
- `express-rate-limit`
- `node-cache` or `redis`

---

#### 19. Audit Log
**Priority:** P2 - Medium
**Effort:** Low (1 day)
**Value:** High

Features:
- [ ] Audit log table
- [ ] Track all CRUD operations
- [ ] Store who/what/when
- [ ] IP address tracking
- [ ] Audit log viewer (admin only)
- [ ] Export audit logs

**Database schema:**
```sql
CREATE TABLE audit_log (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id INTEGER,
  changes JSON,
  ip_address TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

---

#### 20. Data Backup & Recovery
**Priority:** P1 - High
**Effort:** Low (1 day)
**Value:** Critical

Features:
- [ ] Automated daily backups
- [ ] Cloud storage integration (S3/Google Drive)
- [ ] Backup restoration tool
- [ ] Point-in-time recovery
- [ ] Backup verification

**Files to create:**
- `backend/jobs/backupJob.js`
- `backend/services/backupService.js`
- `scripts/backup.sh`

---

#### 21. Multi-Tenant Support (Future)
**Priority:** P4 - Future
**Effort:** High (5+ days)
**Value:** High (for SaaS)

Features:
- [ ] Organizations table
- [ ] User-organization mapping
- [ ] Data isolation by org
- [ ] Public/private/org visibility
- [ ] Organization admin role
- [ ] Billing integration

---

## 📊 IMPLEMENTATION SCHEDULE

### Sprint 1 (Current) - Foundation Complete ✅
- [x] Database & Backend
- [x] Authentication & Authorization
- [x] Basic CRUD operations
- [x] Yahoo Finance integration

### Sprint 2 (Week 1-2) - Core Features
- [ ] #1: Portfolio Analytics Dashboard
- [ ] #2: Real-Time Price Updates
- [ ] #5: Idea Status Lifecycle
- [ ] #17: Background Job System
- [ ] #20: Data Backup & Recovery

### Sprint 3 (Week 3-4) - Automation
- [ ] #3: Reddit Auto-Scraper
- [ ] #4: Price Alerts System
- [ ] #10: Enhanced Filtering & Smart Search

### Sprint 4 (Week 5-6) - Data Enrichment
- [ ] #7: Fundamental Data Integration
- [ ] #8: Export & Reporting
- [ ] #9: Watchlist vs Portfolio

### Sprint 5 (Week 7-8) - Community Features
- [ ] #6: Comments & Discussion
- [ ] #18: Rate Limiting & Caching
- [ ] #19: Audit Log

### Sprint 6 (Week 9+) - Polish
- [ ] #11: Dark Mode
- [ ] #13: Mobile PWA
- [ ] #14: Batch Operations
- [ ] #15: Comparison Tool
- [ ] #16: Local AI Features

---

## 💰 ESTIMATED COSTS

**Current: $0/month**

**After all features:**
```
Required:
├── Hosting: $5-20/month (DigitalOcean/Railway)
├── Domain: $1/month ($12/year)
└── Email (SendGrid): Free tier (100 emails/day)

Optional:
├── X API: $100/month (can skip, use Reddit only)
├── Redis Cloud: Free tier or $5/month
└── Cloud Storage: Free tier or $5/month

Total: $6-25/month (without X API)
```

---

## 🎯 SUCCESS METRICS

After implementing all features, we should see:

**Engagement:**
- [ ] 10x more ideas (via automation)
- [ ] Daily active users
- [ ] Average session duration > 5 min
- [ ] Return visits > 3x/week

**Quality:**
- [ ] Win rate > 60%
- [ ] Average return > market benchmark
- [ ] Ideas from 5+ sources
- [ ] Comments/engagement per idea > 3

**Technical:**
- [ ] 99% uptime
- [ ] < 2s page load time
- [ ] Zero data loss
- [ ] < 5 support tickets/month

---

## 📝 NOTES

- All features maintain "no paid AI" requirement
- Security and data privacy prioritized
- Mobile-first responsive design
- Comprehensive testing for each feature
- Documentation updated with each release

---

**Last Updated:** 2025-12-02
**Version:** 1.0.0
**Next Review:** After Sprint 2

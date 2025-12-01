# AlphaSeek - Stock Ideas Aggregator

<div align="center">
  <h3>Track and analyze stock ideas from social media, hedge funds, and investment blogs</h3>
  <p>A secure, full-stack application with real-time performance tracking powered by Yahoo Finance</p>
</div>

---

## Features

### Core Functionality
- **Admin-Only Idea Management**: Only admins can add, edit, and delete stock ideas
- **User Authentication**: Secure JWT-based authentication with role-based access control
- **Multiple Sources**: Track ideas from Reddit, X (Twitter), Hedge Fund letters, blogs, and more
- **Real-Time Data**: Integration with Yahoo Finance for live stock prices and historical data
- **Performance Tracking**: Monitor performance across multiple timeframes:
  - 1 Week, 1 Month, 6 Months, Year-to-Date
  - 1 Year, 3 Years, 5 Years, Total Return
- **Advanced Filtering**: Search by ticker, company, or thesis; filter by source type and tags
- **Persistent Storage**: SQLite database with automatic caching for performance
- **No Paid AI**: Zero reliance on paid AI services

### User Interface
- Modern, responsive design built with React and TailwindCSS
- TradingView chart integration for visual price tracking
- Real-time price updates and performance metrics
- Mobile-friendly interface

---

## Architecture

```
┌─────────────────┐      ┌──────────────────┐      ┌─────────────────┐
│  React Frontend │ ────>│  Express Backend │ ────>│ SQLite Database │
│   (Port 5173)   │<────>│   (Port 5000)    │<────>│  (Persistent)   │
└─────────────────┘      └──────────────────┘      └─────────────────┘
                                    │
                                    v
                         ┌──────────────────────┐
                         │  Yahoo Finance API   │
                         │  (Historical Data)   │
                         └──────────────────────┘
```

### Technology Stack

**Frontend:**
- React 19 with TypeScript
- Vite for build tooling
- TailwindCSS for styling
- Lucide React for icons
- Recharts for data visualization

**Backend:**
- Node.js with Express.js
- better-sqlite3 for database
- JWT for authentication
- CORS enabled for development

**Data:**
- Yahoo Finance API (via CORS proxies)
- SQLite with automatic caching (24-hour TTL)

---

## Installation & Setup

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn

### Step 1: Install Dependencies

```bash
npm install
```

### Step 2: Environment Configuration

The `.env.local` file is already configured with development defaults:

```env
PORT=5000
NODE_ENV=development
JWT_SECRET=dev-secret-key-change-in-production
VITE_API_URL=http://localhost:5000/api
```

For production, create `.env.production` with secure values.

### Step 3: Run the Application

#### Development Mode (Recommended)

Run both frontend and backend simultaneously:

```bash
npm run dev:all
```

This starts:
- Frontend: http://localhost:5173
- Backend API: http://localhost:5000/api

#### Run Separately

Frontend only:
```bash
npm run dev
```

Backend only:
```bash
npm run dev:server
```

### Step 4: Login

Default admin credentials:
- **Username**: `admin`
- **Password**: `admin123`

**Important**: Change the admin password after first login in production!

---

## Usage Guide

### For Admins

#### Adding a Stock Idea
1. Click "Add Idea" button in the header
2. Enter the stock ticker (e.g., NVDA, AAPL)
3. System auto-fetches company name and current price
4. Fill in:
   - Entry price (pre-filled with current price)
   - Date identified
   - Source type (Reddit, X, Hedge Fund, Blog, etc.)
   - Source name/author
   - Original link (optional)
   - Tags (comma-separated)
   - Investment thesis
   - Summary
   - Conviction level (Low/Medium/High)
5. Click "Add Idea"

The idea will be saved to the database and displayed to all users.

### For All Users

#### Viewing Ideas
- Browse all ideas in the main grid
- Each card shows:
  - Ticker and company name
  - Current price and entry price
  - Total return percentage
  - Performance across all timeframes (1W, 1M, 6M, 1Y, 3Y, 5Y, YTD)
  - TradingView price chart
  - Summary and thesis
  - Source information
  - Original link (if provided)

#### Filtering & Searching
- **Search**: Type ticker, company name, or keywords from thesis/summary
- **Source Filter**: Click buttons to filter by source type (All, Hedge Fund, X, Reddit, Blog, News, Other)
- **Tags**: Click tag filter to select multiple tags

#### Sharing Ideas
- Click the share button on any idea card
- On supported devices, uses native share
- Otherwise, copies summary to clipboard

---

## API Documentation

### Authentication Endpoints

#### POST `/api/auth/login`
```json
{
  "username": "admin",
  "password": "admin123"
}
```

Response:
```json
{
  "token": "jwt_token_here",
  "user": {
    "id": 1,
    "username": "admin",
    "role": "admin"
  }
}
```

#### POST `/api/auth/register`
```json
{
  "username": "newuser",
  "password": "password123",
  "role": "user"
}
```

#### GET `/api/auth/me`
Headers: `Authorization: Bearer <token>`

Returns current user information.

### Stock Ideas Endpoints

#### GET `/api/ideas`
Get all stock ideas (requires authentication)

#### GET `/api/ideas/:id`
Get single idea by ID

#### POST `/api/ideas` (Admin only)
Create new stock idea

#### PUT `/api/ideas/:id` (Admin only)
Update existing idea

#### PATCH `/api/ideas/:id/price` (Admin only)
Update only the current price

#### DELETE `/api/ideas/:id` (Admin only)
Delete an idea

#### GET `/api/ideas/meta/tags`
Get all available tags

### Stock Data Endpoints

#### GET `/api/stocks/:ticker`
Get stock data including current price and 5-year historical data

#### GET `/api/stocks/:ticker/price`
Get only current price (lighter endpoint)

---

## Database Schema

### Tables

**users**
- id (PRIMARY KEY)
- username (UNIQUE)
- password_hash
- role (admin/user)
- created_at

**stock_ideas**
- id (PRIMARY KEY)
- ticker
- company_name
- source
- source_type
- original_link
- entry_date
- entry_price
- current_price
- thesis
- summary
- conviction
- created_by (FOREIGN KEY → users)
- created_at
- updated_at

**tags**
- id (PRIMARY KEY)
- name (UNIQUE)

**stock_idea_tags** (junction table)
- stock_idea_id (FOREIGN KEY)
- tag_id (FOREIGN KEY)

**price_history_cache**
- ticker (PRIMARY KEY)
- history_data (JSON)
- cached_at

---

## Key Improvements Made

### Critical Fixes
1. **Database Persistence**: Added SQLite database - data no longer lost on refresh
2. **Backend API**: Full Express.js REST API with proper separation of concerns
3. **Authentication System**: JWT-based auth with admin/user roles
4. **Admin Controls**: Only admins can add/edit/delete ideas
5. **Complete Timeframes**: Added missing 3Y and 5Y performance tracking
6. **Data Caching**: 24-hour cache for Yahoo Finance data to improve performance

### Architecture Improvements
7. **Proper API Layer**: Clean separation between frontend and backend
8. **Security**: Password hashing, JWT tokens, role-based access control
9. **Error Handling**: Comprehensive error handling and user feedback
10. **Data Validation**: Backend validation for all inputs
11. **Type Safety**: Full TypeScript coverage

### Performance Optimizations
12. **Smart Caching**: Historical data cached in database
13. **Lazy Loading**: Price history only fetched when needed
14. **Proxy Rotation**: Multiple CORS proxies for Yahoo Finance reliability

---

## Security Considerations

### Implemented
- Password hashing (SHA-256)
- JWT token authentication
- Role-based access control
- CORS configuration
- Input validation on backend
- SQL injection prevention (prepared statements)

### Production Checklist
- [ ] Change default admin password
- [ ] Use strong JWT_SECRET
- [ ] Enable HTTPS
- [ ] Set up rate limiting
- [ ] Add request logging
- [ ] Configure production CORS origins
- [ ] Set up database backups
- [ ] Use environment-specific configs

---

## Future Enhancements

### Social Media Integration
- Reddit API integration for automatic idea scraping
- X/Twitter API for tweet monitoring
- RSS feeds for investment blogs (ValueInvestorsClub, etc.)
- Scheduled scraping jobs

### Advanced Features
- Email notifications for new ideas
- Watchlist functionality
- Export to CSV/Excel
- Advanced analytics dashboard
- Price alerts
- Comments/discussion on ideas
- Idea voting/rating system

### Technical Improvements
- PostgreSQL for production (better concurrent write handling)
- Redis for caching
- WebSocket for real-time price updates
- Docker containerization
- CI/CD pipeline
- Automated testing suite

---

## Troubleshooting

### Port Already in Use
If port 5000 or 5173 is in use:
```bash
# Change backend port in .env.local
PORT=5001

# Vite will auto-assign another port for frontend
```

### Database Locked
If you get "database is locked" errors:
- Close all connections
- Delete `backend/alphaseek.db` and restart (will recreate with default admin)

### Yahoo Finance Failures
The app includes 4 CORS proxy rotation. If all fail:
- Fallback prices are automatically used
- Data is cached for 24 hours
- Historical data generation provides realistic mock data

### Authentication Errors
- Check JWT_SECRET is set in .env
- Token expires after 7 days
- Clear localStorage and re-login if issues persist

---

## Contributing

This is a proprietary application. For issues or feature requests, please contact the development team.

---

## License

Proprietary - All Rights Reserved

---

## Support

For questions or issues:
1. Check this README
2. Review API documentation
3. Check browser console for errors
4. Verify backend is running (`npm run dev:server`)
5. Contact development team

---

**Built with ❤️ for serious investors**

const nodemailer = require('nodemailer');

// Email configuration
const EMAIL_CONFIG = {
  // For development/testing, use ethereal.email (free test email service)
  // In production, replace with real SMTP credentials (Gmail, SendGrid, etc.)
  host: process.env.SMTP_HOST || 'smtp.ethereal.email',
  port: process.env.SMTP_PORT || 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER || 'ethereal.user@ethereal.email',
    pass: process.env.SMTP_PASS || 'ethereal-password'
  }
};

// Create transporter
let transporter = null;

async function initializeEmailService() {
  try {
    // For development, create a test account automatically
    if (!process.env.SMTP_USER) {
      console.log('[Email] No SMTP credentials found, creating test account...');
      const testAccount = await nodemailer.createTestAccount();

      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass
        }
      });

      console.log('[Email] Test account created:');
      console.log(`  User: ${testAccount.user}`);
      console.log('  Preview emails at: https://ethereal.email');
    } else {
      transporter = nodemailer.createTransport(EMAIL_CONFIG);
      console.log('[Email] SMTP transporter initialized');
    }

    // Verify connection
    await transporter.verify();
    console.log('[Email] Email service ready');

    return true;
  } catch (error) {
    console.error('[Email] Failed to initialize email service:', error.message);
    console.log('[Email] Email notifications will be disabled');
    return false;
  }
}

// Send email helper
async function sendEmail({ to, subject, html, text }) {
  if (!transporter) {
    console.log('[Email] Transporter not initialized, skipping email');
    return null;
  }

  try {
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || '"AlphaSeek" <noreply@alphaseek.app>',
      to,
      subject,
      text,
      html
    });

    console.log(`[Email] Sent: ${info.messageId}`);

    // Log preview URL for ethereal emails
    if (info.preview) {
      console.log(`[Email] Preview: ${nodemailer.getTestMessageUrl(info)}`);
    }

    return info;
  } catch (error) {
    console.error('[Email] Failed to send email:', error.message);
    return null;
  }
}

// Email templates
function getPriceAlertEmail(alert, idea, currentPrice, user) {
  const change = ((currentPrice - idea.entry_price) / idea.entry_price) * 100;
  const direction = change >= 0 ? 'up' : 'down';
  const emoji = change >= 0 ? '📈' : '📉';

  let triggerReason = '';
  if (alert.alert_type === 'price_target') {
    triggerReason = `${idea.ticker} has reached your target price of $${alert.threshold}`;
  } else if (alert.alert_type === 'percent_change') {
    triggerReason = `${idea.ticker} has moved ${Math.abs(change).toFixed(2)}% (threshold: ${alert.threshold}%)`;
  } else if (alert.alert_type === 'trailing_stop') {
    triggerReason = `${idea.ticker} has triggered your trailing stop at ${alert.threshold}% below peak`;
  }

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 30px;
          border-radius: 10px 10px 0 0;
          text-align: center;
        }
        .content {
          background: #f9f9f9;
          padding: 30px;
          border-radius: 0 0 10px 10px;
        }
        .alert-box {
          background: white;
          border-left: 4px solid ${change >= 0 ? '#10b981' : '#ef4444'};
          padding: 20px;
          margin: 20px 0;
          border-radius: 4px;
        }
        .ticker {
          font-size: 24px;
          font-weight: bold;
          color: #667eea;
        }
        .price {
          font-size: 32px;
          font-weight: bold;
          color: ${change >= 0 ? '#10b981' : '#ef4444'};
          margin: 10px 0;
        }
        .change {
          color: ${change >= 0 ? '#10b981' : '#ef4444'};
          font-weight: bold;
        }
        .details {
          background: white;
          padding: 15px;
          margin: 15px 0;
          border-radius: 4px;
        }
        .button {
          display: inline-block;
          background: #667eea;
          color: white;
          padding: 12px 30px;
          text-decoration: none;
          border-radius: 5px;
          margin-top: 20px;
        }
        .footer {
          text-align: center;
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #ddd;
          color: #888;
          font-size: 12px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${emoji} Price Alert Triggered</h1>
      </div>
      <div class="content">
        <div class="alert-box">
          <div class="ticker">${idea.ticker}</div>
          <div>${idea.company_name}</div>
          <div class="price">$${currentPrice.toFixed(2)}</div>
          <div class="change">${change >= 0 ? '+' : ''}${change.toFixed(2)}%</div>
        </div>

        <p><strong>${triggerReason}</strong></p>

        <div class="details">
          <p><strong>Alert Details:</strong></p>
          <ul>
            <li>Alert Type: ${alert.alert_type.replace('_', ' ').toUpperCase()}</li>
            <li>Entry Price: $${idea.entry_price.toFixed(2)}</li>
            <li>Current Price: $${currentPrice.toFixed(2)}</li>
            <li>Return: <span class="change">${change >= 0 ? '+' : ''}${change.toFixed(2)}%</span></li>
          </ul>
        </div>

        <div class="details">
          <p><strong>Idea Summary:</strong></p>
          <p>${idea.summary}</p>
          <p><strong>Source:</strong> ${idea.source} (${idea.source_type})</p>
          <p><strong>Conviction:</strong> ${idea.conviction}</p>
        </div>

        <center>
          <a href="http://localhost:5173" class="button">View in AlphaSeek</a>
        </center>

        <div class="footer">
          <p>You received this email because you set up a price alert in AlphaSeek.</p>
          <p>To manage your alerts, log in to your AlphaSeek account.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
Price Alert Triggered ${emoji}

${idea.ticker} (${idea.company_name})
Current Price: $${currentPrice.toFixed(2)}
Change: ${change >= 0 ? '+' : ''}${change.toFixed(2)}%

${triggerReason}

Alert Details:
- Alert Type: ${alert.alert_type.replace('_', ' ').toUpperCase()}
- Entry Price: $${idea.entry_price.toFixed(2)}
- Current Price: $${currentPrice.toFixed(2)}
- Return: ${change >= 0 ? '+' : ''}${change.toFixed(2)}%

Idea Summary: ${idea.summary}

View in AlphaSeek: http://localhost:5173
  `;

  return { html, text };
}

function getWeeklySummaryEmail(user, stats, topPerformers) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 30px;
          border-radius: 10px 10px 0 0;
          text-align: center;
        }
        .content {
          background: #f9f9f9;
          padding: 30px;
          border-radius: 0 0 10px 10px;
        }
        .stat-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
          margin: 20px 0;
        }
        .stat-card {
          background: white;
          padding: 20px;
          border-radius: 8px;
          text-align: center;
        }
        .stat-value {
          font-size: 28px;
          font-weight: bold;
          color: #667eea;
        }
        .stat-label {
          color: #888;
          font-size: 14px;
          margin-top: 5px;
        }
        .performer {
          background: white;
          padding: 15px;
          margin: 10px 0;
          border-radius: 4px;
          border-left: 4px solid #10b981;
        }
        .ticker {
          font-weight: bold;
          color: #667eea;
          font-size: 18px;
        }
        .footer {
          text-align: center;
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #ddd;
          color: #888;
          font-size: 12px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>📊 Weekly Portfolio Summary</h1>
        <p>Your AlphaSeek performance this week</p>
      </div>
      <div class="content">
        <h2>Portfolio Overview</h2>
        <div class="stat-grid">
          <div class="stat-card">
            <div class="stat-value">${stats.totalIdeas}</div>
            <div class="stat-label">Total Ideas</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${stats.totalReturn >= 0 ? '+' : ''}${stats.totalReturn.toFixed(2)}%</div>
            <div class="stat-label">Total Return</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${stats.winRate.toFixed(1)}%</div>
            <div class="stat-label">Win Rate</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${stats.averageReturn >= 0 ? '+' : ''}${stats.averageReturn.toFixed(2)}%</div>
            <div class="stat-label">Avg Return</div>
          </div>
        </div>

        <h3>🏆 Top Performers This Week</h3>
        ${topPerformers.map(idea => `
          <div class="performer">
            <div class="ticker">${idea.ticker}</div>
            <div>${idea.company_name}</div>
            <div style="color: #10b981; font-weight: bold; margin-top: 5px;">
              +${(((idea.current_price - idea.entry_price) / idea.entry_price) * 100).toFixed(2)}%
            </div>
          </div>
        `).join('')}

        <div class="footer">
          <p>You received this weekly summary from AlphaSeek.</p>
          <p>To manage your email preferences, log in to your account.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
Weekly Portfolio Summary

Portfolio Overview:
- Total Ideas: ${stats.totalIdeas}
- Total Return: ${stats.totalReturn >= 0 ? '+' : ''}${stats.totalReturn.toFixed(2)}%
- Win Rate: ${stats.winRate.toFixed(1)}%
- Average Return: ${stats.averageReturn >= 0 ? '+' : ''}${stats.averageReturn.toFixed(2)}%

Top Performers This Week:
${topPerformers.map((idea, i) => {
  const ret = (((idea.current_price - idea.entry_price) / idea.entry_price) * 100).toFixed(2);
  return `${i + 1}. ${idea.ticker} - +${ret}%`;
}).join('\n')}

View in AlphaSeek: http://localhost:5173
  `;

  return { html, text };
}

module.exports = {
  initializeEmailService,
  sendEmail,
  getPriceAlertEmail,
  getWeeklySummaryEmail
};

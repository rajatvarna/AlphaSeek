const { db, stockIdeaOps } = require('../database');
const { sendEmail } = require('../services/emailService');

// Track which earnings alerts have been sent
const sentEarningsAlerts = new Set();

/**
 * Check for upcoming earnings and send alerts
 * Sends alerts for earnings within 1 day, 3 days, and 7 days
 */
async function checkEarningsAlerts() {
  try {
    console.log('[Earnings Alert] Checking for upcoming earnings...');

    // Get ideas with upcoming earnings (within 14 days)
    const upcomingIdeas = stockIdeaOps.getUpcomingEarnings(14);

    if (upcomingIdeas.length === 0) {
      console.log('[Earnings Alert] No upcoming earnings found');
      return;
    }

    console.log(`[Earnings Alert] Found ${upcomingIdeas.length} ideas with upcoming earnings`);

    const now = Math.floor(Date.now() / 1000); // Current Unix timestamp
    let alertsSent = 0;

    for (const idea of upcomingIdeas) {
      try {
        const earningsDate = new Date(idea.next_earnings_date_raw * 1000);
        const daysUntil = Math.ceil((idea.next_earnings_date_raw - now) / (24 * 60 * 60));

        // Get admin users to send alerts to
        const admin = db.prepare(`
          SELECT email, username FROM users WHERE id = ?
        `).get(idea.created_by);

        if (!admin || !admin.email) {
          continue;
        }

        // Send alerts at specific intervals: 1 day, 3 days, 7 days
        let shouldAlert = false;
        let alertType = '';

        if (daysUntil <= 1 && daysUntil >= 0) {
          alertType = '1day';
          shouldAlert = true;
        } else if (daysUntil <= 3 && daysUntil > 1) {
          alertType = '3day';
          shouldAlert = true;
        } else if (daysUntil <= 7 && daysUntil > 3) {
          alertType = '7day';
          shouldAlert = true;
        }

        if (shouldAlert) {
          const alertKey = `earnings-${idea.id}-${alertType}`;

          // Check if we've already sent this alert
          if (!sentEarningsAlerts.has(alertKey)) {
            await sendEarningsAlert(idea, daysUntil, admin);
            sentEarningsAlerts.add(alertKey);
            alertsSent++;

            console.log(`[Earnings Alert] Sent ${alertType} alert for ${idea.ticker} to ${admin.email}`);
          }
        }
      } catch (error) {
        console.error(`[Earnings Alert] Error processing ${idea.ticker}:`, error.message);
      }
    }

    if (alertsSent > 0) {
      console.log(`[Earnings Alert] Sent ${alertsSent} earnings alerts`);
    } else {
      console.log('[Earnings Alert] No new earnings alerts to send');
    }

    // Cleanup old alerts (older than 30 days)
    cleanupSentAlerts();

  } catch (error) {
    console.error('[Earnings Alert] Error checking earnings alerts:', error);
  }
}

/**
 * Send earnings alert email
 */
async function sendEarningsAlert(idea, daysUntil, admin) {
  try {
    const urgency = daysUntil <= 1 ? '🔴 URGENT' : daysUntil <= 3 ? '🟠 SOON' : '🔵 UPCOMING';
    const timeframe = daysUntil === 0 ? 'TODAY' : daysUntil === 1 ? 'TOMORROW' : `IN ${daysUntil} DAYS`;

    const subject = `${urgency} Earnings ${timeframe}: ${idea.ticker}`;

    const currentReturn = ((idea.current_price - idea.entry_price) / idea.entry_price) * 100;

    const message = `${idea.ticker} (${idea.company_name}) earnings report ${timeframe.toLowerCase()}.

📅 Earnings Date: ${idea.next_earnings_date}
${idea.estimated_eps ? `💰 Estimated EPS: $${idea.estimated_eps.toFixed(2)}` : ''}

Current Position:
📊 Entry Price: $${idea.entry_price.toFixed(2)}
📈 Current Price: $${idea.current_price.toFixed(2)}
${currentReturn >= 0 ? '🟢' : '🔴'} Return: ${currentReturn >= 0 ? '+' : ''}${currentReturn.toFixed(2)}%

Prepare for potential volatility around the earnings announcement.`;

    await sendEmail({
      to: admin.email,
      subject: subject,
      text: message,
      html: `<div style="font-family: Arial, sans-serif; max-width: 600px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 10px 10px 0 0;">
          <h2 style="color: white; margin: 0;">${urgency} ${idea.ticker} Earnings</h2>
          <p style="color: #f0f0f0; margin: 5px 0 0 0;">${timeframe}</p>
        </div>
        <div style="background: #f9f9f9; padding: 20px; border-radius: 0 0 10px 10px;">
          <div style="background: white; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
            <h3 style="margin: 0 0 10px 0; color: #333;">${idea.ticker} - ${idea.company_name}</h3>
            <p style="margin: 5px 0;"><strong>📅 Earnings Date:</strong> ${idea.next_earnings_date}</p>
            ${idea.estimated_eps ? `<p style="margin: 5px 0;"><strong>💰 Estimated EPS:</strong> $${idea.estimated_eps.toFixed(2)}</p>` : ''}
          </div>

          <div style="background: white; padding: 15px; border-radius: 8px;">
            <h4 style="margin: 0 0 10px 0; color: #333;">Current Position</h4>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 5px 0;"><strong>Entry Price:</strong></td>
                <td style="padding: 5px 0; text-align: right;">$${idea.entry_price.toFixed(2)}</td>
              </tr>
              <tr>
                <td style="padding: 5px 0;"><strong>Current Price:</strong></td>
                <td style="padding: 5px 0; text-align: right;">$${idea.current_price.toFixed(2)}</td>
              </tr>
              <tr style="border-top: 2px solid #eee;">
                <td style="padding: 10px 0;"><strong>Return:</strong></td>
                <td style="padding: 10px 0; text-align: right; font-size: 18px; font-weight: bold; color: ${currentReturn >= 0 ? '#10b981' : '#ef4444'};">
                  ${currentReturn >= 0 ? '+' : ''}${currentReturn.toFixed(2)}%
                </td>
              </tr>
            </table>
          </div>

          <p style="margin-top: 20px; color: #666; font-size: 12px;">
            ⚠️ Prepare for potential volatility around the earnings announcement.
          </p>

          <p style="margin-top: 20px; color: #999; font-size: 11px; text-align: center;">
            This is an automated earnings alert from AlphaSeek
          </p>
        </div>
      </div>`
    });

  } catch (error) {
    console.error(`[Earnings Alert] Error sending email for ${idea.ticker}:`, error.message);
  }
}

/**
 * Clean up old sent alerts
 */
function cleanupSentAlerts() {
  // Keep alerts for 30 days then allow them to be resent
  // This is a simple in-memory cleanup - in production you might want to persist this
  if (sentEarningsAlerts.size > 1000) {
    // Clear half of the oldest alerts
    const toDelete = Array.from(sentEarningsAlerts).slice(0, 500);
    toDelete.forEach(key => sentEarningsAlerts.delete(key));
    console.log('[Earnings Alert] Cleaned up old alert keys');
  }
}

module.exports = {
  checkEarningsAlerts
};

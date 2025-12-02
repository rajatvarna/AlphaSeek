const { db } = require('../database');
const { sendEmail, getPriceAlertEmail } = require('../services/emailService');

// Track which alerts have been triggered to avoid duplicate notifications
const triggeredAlerts = new Set();

async function checkAlerts() {
  try {
    console.log('[Alert Checker] Checking price alerts...');

    // Get all active alerts
    const alerts = db.prepare(`
      SELECT a.*, u.email, u.username
      FROM price_alerts a
      JOIN users u ON a.user_id = u.id
      WHERE a.active = TRUE
    `).all();

    if (alerts.length === 0) {
      console.log('[Alert Checker] No active alerts found');
      return;
    }

    console.log(`[Alert Checker] Found ${alerts.length} active alerts`);

    let triggeredCount = 0;

    for (const alert of alerts) {
      try {
        // Get current idea data
        const idea = db.prepare(`
          SELECT * FROM stock_ideas WHERE id = ?
        `).get(alert.idea_id);

        if (!idea) {
          console.log(`[Alert Checker] Idea ${alert.idea_id} not found, skipping alert ${alert.id}`);
          continue;
        }

        const currentPrice = idea.current_price;
        const entryPrice = idea.entry_price;
        const percentChange = ((currentPrice - entryPrice) / entryPrice) * 100;

        let triggered = false;

        // Check alert conditions
        if (alert.alert_type === 'price_target') {
          if (currentPrice >= alert.threshold) {
            triggered = true;
          }
        } else if (alert.alert_type === 'percent_change') {
          if (Math.abs(percentChange) >= alert.threshold) {
            triggered = true;
          }
        } else if (alert.alert_type === 'trailing_stop') {
          // For trailing stop, we need to track the peak price
          // This is a simplified version - in production, you'd want to store peak price
          const peakPrice = Math.max(currentPrice, entryPrice);
          const dropFromPeak = ((peakPrice - currentPrice) / peakPrice) * 100;

          if (dropFromPeak >= alert.threshold) {
            triggered = true;
          }
        }

        // If alert triggered and not already notified
        const alertKey = `${alert.id}-${Math.floor(Date.now() / (1000 * 60 * 60))}`; // Hour-based key
        if (triggered && !triggeredAlerts.has(alertKey)) {
          console.log(`[Alert Checker] Alert triggered: ${alert.alert_type} for ${idea.ticker}`);

          // Send email notification if user has email
          if (alert.email) {
            const emailContent = getPriceAlertEmail(alert, idea, currentPrice, {
              username: alert.username,
              email: alert.email
            });

            await sendEmail({
              to: alert.email,
              subject: `🚨 Price Alert: ${idea.ticker} - ${alert.alert_type.replace('_', ' ').toUpperCase()}`,
              html: emailContent.html,
              text: emailContent.text
            });

            console.log(`[Alert Checker] Email sent to ${alert.email} for ${idea.ticker}`);
          }

          // Mark alert as triggered
          triggeredAlerts.add(alertKey);
          triggeredCount++;

          // Optionally deactivate one-time alerts
          if (alert.alert_type === 'price_target') {
            db.prepare(`
              UPDATE price_alerts SET active = FALSE WHERE id = ?
            `).run(alert.id);
            console.log(`[Alert Checker] Deactivated price target alert ${alert.id}`);
          }
        }
      } catch (error) {
        console.error(`[Alert Checker] Error checking alert ${alert.id}:`, error.message);
      }
    }

    if (triggeredCount > 0) {
      console.log(`[Alert Checker] Triggered ${triggeredCount} alerts`);
    } else {
      console.log('[Alert Checker] No alerts triggered');
    }

    // Clean up old triggered alerts (older than 24 hours)
    cleanupTriggeredAlerts();

  } catch (error) {
    console.error('[Alert Checker] Error in alert checker:', error);
  }
}

function cleanupTriggeredAlerts() {
  const now = Date.now();
  const dayAgo = now - (24 * 60 * 60 * 1000);

  for (const alertKey of triggeredAlerts) {
    const timestamp = parseInt(alertKey.split('-').pop()) * 1000 * 60 * 60;
    if (timestamp < dayAgo) {
      triggeredAlerts.delete(alertKey);
    }
  }
}

module.exports = {
  checkAlerts
};

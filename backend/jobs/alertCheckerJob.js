const { db } = require('../database');
const { sendEmail, getPriceAlertEmail } = require('../services/emailService');

// Track which alerts have been triggered to avoid duplicate notifications
const triggeredAlerts = new Set();

/**
 * Check exit strategy alerts (stop loss and profit targets)
 * These are configured per-idea in the exit_strategy fields
 */
async function checkExitStrategyAlerts() {
  try {
    // Get all active ideas with exit strategies
    const ideasWithExitStrategy = db.prepare(`
      SELECT si.*, u.email, u.username
      FROM stock_ideas si
      JOIN users u ON si.created_by = u.id
      WHERE si.status = 'Active'
        AND (si.stop_loss_price IS NOT NULL OR si.profit_target_price IS NOT NULL)
    `).all();

    if (ideasWithExitStrategy.length === 0) {
      return;
    }

    console.log(`[Alert Checker] Checking ${ideasWithExitStrategy.length} ideas with exit strategies`);

    let alertsTriggered = 0;

    for (const idea of ideasWithExitStrategy) {
      const currentPrice = idea.current_price;

      // Check stop loss
      if (idea.stop_loss_price && currentPrice <= idea.stop_loss_price) {
        const alertKey = `exit-stop-${idea.id}-${Math.floor(Date.now() / (1000 * 60 * 60))}`;

        if (!triggeredAlerts.has(alertKey)) {
          console.log(`[Alert Checker] 🔴 STOP LOSS triggered for ${idea.ticker} at $${currentPrice.toFixed(2)}`);

          // Send notification (if email service is configured)
          if (idea.email) {
            await sendExitStrategyAlert(idea, 'stop_loss', currentPrice);
          }

          triggeredAlerts.add(alertKey);
          alertsTriggered++;
        }
      }

      // Check profit target
      if (idea.profit_target_price && currentPrice >= idea.profit_target_price) {
        const alertKey = `exit-target-${idea.id}-${Math.floor(Date.now() / (1000 * 60 * 60))}`;

        if (!triggeredAlerts.has(alertKey)) {
          console.log(`[Alert Checker] 🟢 PROFIT TARGET reached for ${idea.ticker} at $${currentPrice.toFixed(2)}`);

          // Send notification (if email service is configured)
          if (idea.email) {
            await sendExitStrategyAlert(idea, 'profit_target', currentPrice);
          }

          triggeredAlerts.add(alertKey);
          alertsTriggered++;
        }
      }

      // Check trailing stop
      if (idea.trailing_stop_pct) {
        // Calculate trailing stop price based on entry price
        const trailingStopPrice = idea.entry_price * (1 - idea.trailing_stop_pct / 100);

        if (currentPrice <= trailingStopPrice) {
          const alertKey = `exit-trailing-${idea.id}-${Math.floor(Date.now() / (1000 * 60 * 60))}`;

          if (!triggeredAlerts.has(alertKey)) {
            console.log(`[Alert Checker] 🟠 TRAILING STOP triggered for ${idea.ticker} at $${currentPrice.toFixed(2)}`);

            // Send notification (if email service is configured)
            if (idea.email) {
              await sendExitStrategyAlert(idea, 'trailing_stop', currentPrice);
            }

            triggeredAlerts.add(alertKey);
            alertsTriggered++;
          }
        }
      }
    }

    if (alertsTriggered > 0) {
      console.log(`[Alert Checker] Triggered ${alertsTriggered} exit strategy alerts`);
    }

  } catch (error) {
    console.error('[Alert Checker] Error checking exit strategy alerts:', error);
  }
}

/**
 * Send exit strategy alert notification
 */
async function sendExitStrategyAlert(idea, alertType, currentPrice) {
  try {
    const percentChange = ((currentPrice - idea.entry_price) / idea.entry_price) * 100;

    let subject = '';
    let message = '';

    if (alertType === 'stop_loss') {
      subject = `🔴 STOP LOSS: ${idea.ticker}`;
      message = `Stop loss triggered for ${idea.ticker} (${idea.company_name}).\n\nCurrent Price: $${currentPrice.toFixed(2)}\nStop Loss: $${idea.stop_loss_price.toFixed(2)}\nEntry Price: $${idea.entry_price.toFixed(2)}\nReturn: ${percentChange.toFixed(2)}%`;
    } else if (alertType === 'profit_target') {
      subject = `🟢 PROFIT TARGET: ${idea.ticker}`;
      message = `Profit target reached for ${idea.ticker} (${idea.company_name})!\n\nCurrent Price: $${currentPrice.toFixed(2)}\nProfit Target: $${idea.profit_target_price.toFixed(2)}\nEntry Price: $${idea.entry_price.toFixed(2)}\nReturn: +${percentChange.toFixed(2)}%`;
    } else if (alertType === 'trailing_stop') {
      const trailingStopPrice = idea.entry_price * (1 - idea.trailing_stop_pct / 100);
      subject = `🟠 TRAILING STOP: ${idea.ticker}`;
      message = `Trailing stop triggered for ${idea.ticker} (${idea.company_name}).\n\nCurrent Price: $${currentPrice.toFixed(2)}\nTrailing Stop: ${idea.trailing_stop_pct}% (${trailingStopPrice.toFixed(2)})\nEntry Price: $${idea.entry_price.toFixed(2)}\nReturn: ${percentChange.toFixed(2)}%`;
    }

    // Send email if email service is configured
    await sendEmail({
      to: idea.email,
      subject: subject,
      text: message,
      html: `<div style="font-family: Arial, sans-serif;">
        <h2>${subject}</h2>
        <p>${message.replace(/\n/g, '<br>')}</p>
        <p style="margin-top: 20px; color: #666;">
          <small>This is an automated alert from AlphaSeek. View your ideas at <a href="#">AlphaSeek Dashboard</a></small>
        </p>
      </div>`
    });

  } catch (error) {
    console.error(`[Alert Checker] Error sending exit strategy alert for ${idea.ticker}:`, error.message);
  }
}

async function checkAlerts() {
  try {
    console.log('[Alert Checker] Checking price alerts and exit strategies...');

    // Check exit strategy alerts first (stop loss and profit targets)
    await checkExitStrategyAlerts();

    // Get all active alerts
    const alerts = db.prepare(`
      SELECT a.*, u.email, u.username
      FROM price_alerts a
      JOIN users u ON a.user_id = u.id
      WHERE a.active = TRUE
    `).all();

    if (alerts.length === 0) {
      console.log('[Alert Checker] No active custom alerts found');
      return;
    }

    console.log(`[Alert Checker] Found ${alerts.length} active custom alerts`);

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

const { Parser } = require('json2csv');

/**
 * Export stock ideas to CSV format
 */
function exportToCSV(ideas) {
  const fields = [
    { label: 'Ticker', value: 'ticker' },
    { label: 'Company', value: 'company_name' },
    { label: 'Source Type', value: 'source_type' },
    { label: 'Source', value: 'source' },
    { label: 'Entry Date', value: 'entry_date' },
    { label: 'Entry Price', value: 'entry_price' },
    { label: 'Current Price', value: 'current_price' },
    { label: 'Return %', value: row => {
      const returnPct = ((row.current_price - row.entry_price) / row.entry_price) * 100;
      return returnPct.toFixed(2);
    }},
    { label: 'Conviction', value: 'conviction' },
    { label: 'Status', value: 'status' },
    { label: 'Tags', value: row => row.tags || '' },
    { label: 'Summary', value: 'summary' },
    { label: 'Link', value: 'original_link' }
  ];

  const parser = new Parser({ fields });
  const csv = parser.parse(ideas);

  return csv;
}

/**
 * Export to JSON (already formatted)
 */
function exportToJSON(ideas) {
  return JSON.stringify(ideas, null, 2);
}

/**
 * Generate export filename with timestamp
 */
function generateFilename(format = 'csv') {
  const timestamp = new Date().toISOString().split('T')[0];
  return `alphaseek-ideas-${timestamp}.${format}`;
}

module.exports = {
  exportToCSV,
  exportToJSON,
  generateFilename
};

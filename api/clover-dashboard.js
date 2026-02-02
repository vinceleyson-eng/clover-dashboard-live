import { google } from 'googleapis';

// Clover Marketing Configuration
const CLOVER_CONFIG = {
  propertyId: '422676289', // Clover Marketing GA4 property
  name: 'Clover Marketing Group'
};

// OAuth credentials (from environment variables)
const OAUTH_CLIENT = JSON.parse(process.env.CLOVER_OAUTH_CLIENT || '{}');
const OAUTH_TOKEN = JSON.parse(process.env.CLOVER_OAUTH_TOKEN || '{}');

function getAuth() {
  try {
    const { client_secret, client_id, redirect_uris } = OAUTH_CLIENT.web;
    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
    oAuth2Client.setCredentials(OAUTH_TOKEN);
    return oAuth2Client;
  } catch (error) {
    throw new Error('OAuth configuration error: ' + error.message);
  }
}

function formatDate(date) {
  return date.toISOString().split('T')[0];
}

function getDateRange(startDate, endDate, compare = false) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  const ranges = [{
    startDate: formatDate(start),
    endDate: formatDate(end)
  }];
  
  if (compare) {
    const days = Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;
    const compareStart = new Date(start);
    compareStart.setDate(compareStart.getDate() - days);
    const compareEnd = new Date(end);
    compareEnd.setDate(compareEnd.getDate() - days);
    
    ranges.push({
      startDate: formatDate(compareStart),
      endDate: formatDate(compareEnd)
    });
  }
  
  return ranges;
}

async function getGA4Data(dateRanges, metrics, dimensions = []) {
  try {
    const auth = getAuth();
    const analyticsData = google.analyticsdata('v1beta');

    const response = await analyticsData.properties.runReport({
      auth,
      property: `properties/${CLOVER_CONFIG.propertyId}`,
      requestBody: {
        dateRanges,
        metrics,
        dimensions,
        orderBys: dimensions.length > 0 ? [{ 
          metric: { metricName: metrics[0].name },
          desc: true 
        }] : undefined,
        limit: 100
      }
    });

    return { success: true, data: response.data };
  } catch (error) {
    console.error('GA4 API Error:', error);
    return { success: false, error: error.message };
  }
}

async function getOverviewMetrics(dateRanges) {
  const metrics = [
    { name: 'screenPageViews' }, // Fixed: use screenPageViews instead of pageviews
    { name: 'sessions' },
    { name: 'activeUsers' },
    { name: 'bounceRate' },
    { name: 'averageSessionDuration' },
    { name: 'conversions' },
    { name: 'engagementRate' }
  ];
  
  return await getGA4Data(dateRanges, metrics);
}

async function getChartData(dateRanges) {
  const metrics = [
    { name: 'sessions' },
    { name: 'screenPageViews' }
  ];
  
  const dimensions = [{ name: 'date' }];
  
  return await getGA4Data(dateRanges, metrics, dimensions);
}

async function getTopPages(dateRanges) {
  const metrics = [
    { name: 'screenPageViews' },
    { name: 'sessions' },
    { name: 'activeUsers' },
    { name: 'bounceRate' },
    { name: 'averageSessionDuration' }
  ];
  
  const dimensions = [{ name: 'pageTitle' }, { name: 'pagePath' }];
  
  return await getGA4Data(dateRanges.slice(0, 1), metrics, dimensions); // Only current period for tables
}

async function getTrafficSources(dateRanges) {
  const metrics = [
    { name: 'sessions' },
    { name: 'activeUsers' },
    { name: 'screenPageViews' },
    { name: 'bounceRate' }
  ];
  
  const dimensions = [
    { name: 'sessionSource' },
    { name: 'sessionMedium' }
  ];
  
  return await getGA4Data(dateRanges.slice(0, 1), metrics, dimensions); // Only current period for tables
}

function processOverviewData(response, isComparing) {
  if (!response.success || !response.data.rows) {
    return [];
  }
  
  const currentData = response.data.rows[0]?.metricValues || [];
  const previousData = isComparing && response.data.rows[1]?.metricValues ? response.data.rows[1].metricValues : null;
  
  const metrics = [
    {
      title: 'Page Views',
      value: parseInt(currentData[0]?.value || 0),
      change: previousData ? calculatePercentChange(currentData[0]?.value, previousData[0]?.value) : undefined,
      changeDiff: previousData ? parseInt(currentData[0]?.value || 0) - parseInt(previousData[0]?.value || 0) : undefined
    },
    {
      title: 'Sessions',
      value: parseInt(currentData[1]?.value || 0),
      change: previousData ? calculatePercentChange(currentData[1]?.value, previousData[1]?.value) : undefined,
      changeDiff: previousData ? parseInt(currentData[1]?.value || 0) - parseInt(previousData[1]?.value || 0) : undefined
    },
    {
      title: 'Users',
      value: parseInt(currentData[2]?.value || 0),
      change: previousData ? calculatePercentChange(currentData[2]?.value, previousData[2]?.value) : undefined,
      changeDiff: previousData ? parseInt(currentData[2]?.value || 0) - parseInt(previousData[2]?.value || 0) : undefined
    },
    {
      title: 'Bounce Rate',
      value: parseFloat(currentData[3]?.value || 0),
      change: previousData ? calculatePercentChange(currentData[3]?.value, previousData[3]?.value, true) : undefined,
      changeDiff: previousData ? parseFloat(currentData[3]?.value || 0) - parseFloat(previousData[3]?.value || 0) : undefined
    },
    {
      title: 'Avg. Session Duration',
      value: parseFloat(currentData[4]?.value || 0),
      change: previousData ? calculatePercentChange(currentData[4]?.value, previousData[4]?.value) : undefined,
      changeDiff: previousData ? parseFloat(currentData[4]?.value || 0) - parseFloat(previousData[4]?.value || 0) : undefined
    },
    {
      title: 'Conversions',
      value: parseInt(currentData[5]?.value || 0),
      change: previousData ? calculatePercentChange(currentData[5]?.value, previousData[5]?.value) : undefined,
      changeDiff: previousData ? parseInt(currentData[5]?.value || 0) - parseInt(previousData[5]?.value || 0) : undefined
    },
    {
      title: 'Engagement Rate',
      value: parseFloat(currentData[6]?.value || 0),
      change: previousData ? calculatePercentChange(currentData[6]?.value, previousData[6]?.value) : undefined,
      changeDiff: previousData ? parseFloat(currentData[6]?.value || 0) - parseFloat(previousData[6]?.value || 0) : undefined
    }
  ];
  
  return metrics;
}

function calculatePercentChange(current, previous, inverse = false) {
  const curr = parseFloat(current || 0);
  const prev = parseFloat(previous || 0);
  
  if (prev === 0) return 0;
  
  let change = ((curr - prev) / prev) * 100;
  return inverse ? -change : change; // For metrics like bounce rate where lower is better
}

function processChartData(response, isComparing) {
  if (!response.success || !response.data.rows) {
    return {
      labels: [],
      sessions: [],
      pageviews: [],
      previousSessions: [],
      previousPageviews: []
    };
  }
  
  const dateMap = new Map();
  const previousDateMap = new Map();
  
  response.data.rows.forEach(row => {
    const date = row.dimensionValues[0].value;
    const sessions = parseInt(row.metricValues[0].value || 0);
    const pageviews = parseInt(row.metricValues[1].value || 0);
    
    // Determine if this is current period or previous period data
    const isPrevious = isComparing && response.data.dateRanges?.length > 1;
    
    if (isPrevious) {
      previousDateMap.set(date, { sessions, pageviews });
    } else {
      dateMap.set(date, { sessions, pageviews });
    }
  });
  
  // Sort dates
  const sortedDates = Array.from(dateMap.keys()).sort();
  
  return {
    labels: sortedDates,
    sessions: sortedDates.map(date => dateMap.get(date)?.sessions || 0),
    pageviews: sortedDates.map(date => dateMap.get(date)?.pageviews || 0),
    previousSessions: isComparing ? sortedDates.map(date => previousDateMap.get(date)?.sessions || 0) : null,
    previousPageviews: isComparing ? sortedDates.map(date => previousDateMap.get(date)?.pageviews || 0) : null
  };
}

function processTableData(response, type) {
  if (!response.success || !response.data.rows) {
    return [];
  }
  
  return response.data.rows.map(row => {
    if (type === 'pages') {
      return {
        page: row.dimensionValues[1]?.value || '(not set)', // pagePath
        title: row.dimensionValues[0]?.value || '(not set)', // pageTitle
        pageviews: parseInt(row.metricValues[0]?.value || 0),
        sessions: parseInt(row.metricValues[1]?.value || 0),
        users: parseInt(row.metricValues[2]?.value || 0),
        bounce_rate: parseFloat(row.metricValues[3]?.value || 0),
        avg_duration: parseFloat(row.metricValues[4]?.value || 0)
      };
    } else if (type === 'sources') {
      return {
        source: row.dimensionValues[0]?.value || '(direct)',
        medium: row.dimensionValues[1]?.value || '(none)',
        sessions: parseInt(row.metricValues[0]?.value || 0),
        users: parseInt(row.metricValues[1]?.value || 0),
        pageviews: parseInt(row.metricValues[2]?.value || 0),
        bounce_rate: parseFloat(row.metricValues[3]?.value || 0)
      };
    }
  }).slice(0, 20); // Limit to top 20 results
}

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { start, end, compare = 'false' } = req.query;

  if (!start || !end) {
    return res.status(400).json({ error: 'Start and end dates are required' });
  }

  const isComparing = compare === 'true';
  const dateRanges = getDateRange(start, end, isComparing);

  try {
    // Fetch all data in parallel
    const [overviewResponse, chartResponse, pagesResponse, sourcesResponse] = await Promise.all([
      getOverviewMetrics(dateRanges),
      getChartData(dateRanges),
      getTopPages(dateRanges),
      getTrafficSources(dateRanges)
    ]);

    // Process responses
    const metrics = processOverviewData(overviewResponse, isComparing);
    const chartData = processChartData(chartResponse, isComparing);
    const topPages = processTableData(pagesResponse, 'pages');
    const trafficSources = processTableData(sourcesResponse, 'sources');

    res.json({
      success: true,
      site: CLOVER_CONFIG.name,
      dateRange: { start, end },
      isComparing,
      metrics,
      chartData,
      topPages,
      trafficSources,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Dashboard API Error:', error);
    res.status(500).json({ error: error.message });
  }
}
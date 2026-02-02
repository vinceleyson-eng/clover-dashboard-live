import { google } from 'googleapis';

// Clover Configuration
const CLOVER_CONFIG = {
  properties: {
    'the-pg': '501114179',
    'clover-marketing': '422676289'
  },
  gscSites: {
    'the-pg': 'https://thepg.com.au/',
    'clover-marketing': 'https://clovermarketinggroup.com.au/'
  },
  names: {
    'the-pg': 'The PG',
    'clover-marketing': 'Clover Marketing'
  }
};

// OAuth credentials (from environment variables)
const OAUTH_CLIENT = JSON.parse(process.env.CLOVER_OAUTH_CLIENT);
const OAUTH_TOKEN = JSON.parse(process.env.CLOVER_OAUTH_TOKEN);

function getAuth() {
  const { client_secret, client_id, redirect_uris } = OAUTH_CLIENT.web;
  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
  oAuth2Client.setCredentials(OAUTH_TOKEN);
  return oAuth2Client;
}

async function getGA4Overview(propertyId, days = 7) {
  try {
    const auth = getAuth();
    const analyticsData = google.analyticsdata('v1beta');

    const response = await analyticsData.properties.runReport({
      auth,
      property: `properties/${propertyId}`,
      requestBody: {
        dateRanges: [{ startDate: `${days}daysAgo`, endDate: 'today' }],
        metrics: [
          { name: 'sessions' },
          { name: 'activeUsers' },
          { name: 'pageviews' },
          { name: 'bounceRate' },
          { name: 'averageSessionDuration' }
        ],
        dimensions: [{ name: 'date' }]
      }
    });

    return { success: true, data: response.data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function getGSCOverview(siteUrl, days = 7) {
  try {
    const auth = getAuth();
    const searchConsole = google.searchconsole('v1');
    
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const response = await searchConsole.searchanalytics.query({
      auth,
      siteUrl,
      requestBody: {
        startDate,
        endDate,
        dimensions: ['date'],
        rowLimit: 25000
      }
    });

    return { success: true, data: response.data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { site, days = 7 } = req.query;

  if (!site || !CLOVER_CONFIG.properties[site]) {
    return res.status(404).json({ error: 'Site not found' });
  }

  const propertyId = CLOVER_CONFIG.properties[site];
  const siteUrl = CLOVER_CONFIG.gscSites[site];

  try {
    const [ga4Overview, gscOverview] = await Promise.all([
      getGA4Overview(propertyId, parseInt(days)),
      getGSCOverview(siteUrl, parseInt(days))
    ]);

    res.json({
      site: CLOVER_CONFIG.names[site],
      ga4: { overview: ga4Overview },
      gsc: { overview: gscOverview }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
/**
 * Configuration Management for GAS Sync Service
 *
 * SECURITY BEST PRACTICE:
 * Store sensitive values in Script Properties instead of hardcoding
 */

/**
 * Initialize configuration from Script Properties
 * Run this once after deployment
 */
function initializeConfig() {
  const scriptProperties = PropertiesService.getScriptProperties();

  scriptProperties.setProperties({
    'BACKEND_API_URL': 'https://your-app.vercel.app/api/webhook/appsheet',
    'API_SECRET_KEY': 'your-secret-key-here', // CHANGE THIS!
    'MAIN_SPREADSHEET_ID': '18pS9YMZSwZCVBt_anIGn3GN4qFoPpMtALQm4YvMDd-g',
    'DEBUG_MODE': 'true'
  });

  Logger.log('Configuration initialized successfully');
  Logger.log('IMPORTANT: Update API_SECRET_KEY in Script Properties!');
}

/**
 * Get configuration value from Script Properties
 * Falls back to hardcoded value if not set
 */
function getConfig(key, defaultValue = null) {
  const scriptProperties = PropertiesService.getScriptProperties();
  const value = scriptProperties.getProperty(key);

  if (value === null) {
    Logger.log(`Warning: Config key "${key}" not found in Script Properties, using default`);
    return defaultValue;
  }

  return value;
}

/**
 * Update a single configuration value
 */
function updateConfig(key, value) {
  const scriptProperties = PropertiesService.getScriptProperties();
  scriptProperties.setProperty(key, value);
  Logger.log(`Updated config: ${key} = ${value}`);
}

/**
 * View all configuration (for debugging)
 * SECURITY: API keys will be masked
 */
function viewConfig() {
  const scriptProperties = PropertiesService.getScriptProperties();
  const allProperties = scriptProperties.getProperties();

  Logger.log('=== Current Configuration ===');

  for (const key in allProperties) {
    let value = allProperties[key];

    // Mask sensitive values
    if (key.includes('KEY') || key.includes('SECRET') || key.includes('PASSWORD')) {
      value = value.substring(0, 10) + '...';
    }

    Logger.log(`${key}: ${value}`);
  }
}

/**
 * Delete all configuration (use with caution!)
 */
function clearConfig() {
  const scriptProperties = PropertiesService.getScriptProperties();
  scriptProperties.deleteAllProperties();
  Logger.log('All configuration cleared');
}

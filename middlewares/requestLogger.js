import fs from 'fs';
import path from 'path';

const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const logFilePath = path.join(logsDir, 'access.log');

export const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const method = req.method;
    const route = req.originalUrl || req.url;
    
    // User email/id if authenticated
    const user = req.user ? req.user.email || req.user._id : 'Anonymous';
    const status = res.statusCode;
    
    // Extract error if handler set it in res.locals
    const errorMsg = res.locals.error || '';
    
    const timestamp = new Date().toISOString();
    const logLine = `[${timestamp}] ${method} ${route} | User: ${user} | Status: ${status} | Duration: ${duration}ms${errorMsg ? ` | Error: ${errorMsg}` : ''}\n`;
    
    // Write to file
    fs.appendFile(logFilePath, logLine, (err) => {
      if (err) {
        console.error('[LOGGER ERROR] Failed to write access log:', err);
      }
    });

    // Console logging in custom format for visibility
    if (status >= 400) {
      console.log(`\x1b[31m[API] ${timestamp} ${method} ${route} | User: ${user} | Status: ${status} | ${duration}ms${errorMsg ? ` | Error: ${errorMsg}` : ''}\x1b[0m`);
    } else {
      console.log(`\x1b[32m[API] ${timestamp} ${method} ${route} | User: ${user} | Status: ${status} | ${duration}ms\x1b[0m`);
    }
  });
  
  next();
};

export default requestLogger;

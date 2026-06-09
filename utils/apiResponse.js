/**
 * Standard Success Response Format
 * @param {Response} res - Express response object
 * @param {any} data - Data payload to return
 * @param {string} message - Message detail
 * @param {number} statusCode - HTTP status code (default 200)
 */
export const sendSuccess = (res, data, message = 'Success', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

export const success = (res, status, message, data = undefined) =>
  res.status(status).json({ success: true, message, data });

export const failure = (res, status, message, errors = undefined) =>
  res.status(status).json({ success: false, message, errors });
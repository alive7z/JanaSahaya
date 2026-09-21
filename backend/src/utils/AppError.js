class AppError extends Error {
  constructor(status, message, details = undefined) {
    super(message);
    this.status = status;
    this.details = details;
    this.name = 'AppError';
  }
}

export default AppError;
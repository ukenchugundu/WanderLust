class ExpressError extends Error {
    constructor(message, statusCode, errorDetails = []) {
        super();
        this.message = message;
        this.statusCode = statusCode;
        this.errorDetails = errorDetails;
    }
}

module.exports = ExpressError;

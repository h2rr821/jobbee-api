const ErrorHandler = require('../utils/errorHander');

module.exports = (err, req, res, next) => {
    err.statusCode = err.statusCode || 500;
    console.log('error middleware');
    console.log('env: ', process.env.NODE_ENV);

    if (process.env.NODE_ENV === 'development') {

        console.log('development');
        res.status(err.statusCode).json({
            success: false,
            error: err,
            errMessage: err.message,
            stack: err.stack
        });
    }

    if (process.env.NODE_ENV === 'production ') {

        console.log('production');
        let error = {...err};

        error.message = err.message;

        // Wrong Mongoose Object id error
        if (err.name === 'CastError') {
            const message = `Resource not found. Invalid: ${err.path}`;
            error = new ErrorHandler(message, 404);
        }

        // Handling Mongoose validation error
        if (err.name === 'ValidationError') {
            const message = Object.values(err.errors).map(value => value.message);

            error = new ErrorHandler(message, 400);
        }

        // Handling mongoose duplicate key error
        if (err.code === 11000) {
            const message = `Duplicate ${Object.keys(err.keyValue)} entered`;
            error = new ErrorHandler(message, 400);
        }

        // Handling wrong jwt token error
        if (err.name === 'JsonWebTokenError') {
            const message = 'JSON Web Token is invalid. Try Again';
            error = new ErrorHandler(message, 500); 
        }

        // Handing Expired JWT Token error
        if (err.name === 'TokenExpiredError') {
            const message = 'JSON Web Token is expired. Try Again';
            error = new ErrorHandler(message, 500); 
        }

        res.status(error.statusCode).json({
            success: false,
            message: error.message
        });
    }
    next();
}
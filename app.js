const express = require('express');

const app = express();

const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const fileUpload = require('express-fileupload');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xssClean = require('xss-clean'); 
const hpp = require('hpp');
const cors = require('cors');
const bodyParser = require('body-parser');

const connectDatabase = require('./config/database');
const errorMiddleWare = require('./middlewares/errors');
const ErrorHandler = require('./utils/errorHander');

// set up config.env file
dotenv.config({path: './config/config.env'});

// handling uncaught exception --> have to be on the top
process.on('uncaughtException', err => {
    console.log(`Error: ${err.message}`);
    console.log('Shutting down due to uncaught exception');
    process.exit(1);
});

// Connecting to database
connectDatabase();

// set up body parser
app.use(bodyParser.urlencoded({ extended: true }));

app.use(express.static('public'));

// Setup security header
app.use(helmet());

// set up body parser
app.use(express.json());

// set cookie parser
app.use(cookieParser());

// Create own middleware
// const middleware = (req, res, next) => {
//     console.log('hello from middleware');

//     // set up global var
//     next();
// };

// app.use(middleware);

app.use(fileUpload());

// sanitize data
app.use(mongoSanitize());

// prevent xss attacks
app.use(xssClean());

// Prevent parameter pullution
app.use(hpp({
    whitelist: ['positions']
}));

// Rate Liming 
const limiter = rateLimit({
    windowMs: 10*60*1000, //10 mins
    max: 100
})

// setup cors -- accessable by other domains
app.use(cors());

app.use(limiter);

// Importing all routes
const jobs = require('./routes/jobs');
const auth = require('./routes/auth');
const user = require('./routes/user');


app.use('/api/v1', jobs);
app.use('/api/v1', auth);
app.use('/api/v1', user);

// Handle unhandled routes
app.all('*', (req, res, next) => {
    next(new ErrorHandler(`${req.originalUrl} route not found`, 404))
});

app.use(errorMiddleWare);
const PORT = process.env.PORT;
const server = app.listen(PORT, () => {
    console.log(`Server start on port: ${process.env.PORT} in ${process.env.NODE_ENV} mode`);
});

// handling unhandled promise rejection
process.on('unhandledRejection', err => {
    console.log(`Error: ${err.message}`);
    console.log('Shuting down the server due to unhandled promise rejection');
    server.close(() => {
        process.exit(1);
    });
});



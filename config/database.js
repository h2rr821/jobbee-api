const mongoose = require('mongoose');

// const connectDatabase = () => {mongoose.connect(process.env.DB_LOCAL_URI, {
const connectDatabase = () => {mongoose.connect(process.env.DB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(con => {
    console.log(`MongoDB Database connected with host ${con.connection.host}`);
  });
};

module.exports = connectDatabase;
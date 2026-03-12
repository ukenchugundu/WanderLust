const mongoose = require('mongoose');
const initdata = require('./data.js');
const listing = require('../models/listings');

const mongoUrl = process.env.MONGO_URL || 'mongodb://127.0.0.1:27017/Wanderlust';


async function main() {
  await mongoose.connect(mongoUrl);
  console.log('Connected to MongoDB');
}


const initDB = async () => {
    await listing.deleteMany({});
    await listing.insertMany(initdata.data);
    console.log("Database initialized with sample data");
}
main()
  .then(initDB)
  .catch((err) => {
    console.error(`Error connecting to MongoDB at ${mongoUrl}`);
    console.error('Start MongoDB locally or set the MONGO_URL environment variable.');
    console.error(err.message);
    process.exit(1);
  });

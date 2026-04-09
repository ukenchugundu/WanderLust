const mongoose = require('mongoose');
const initdata = require('./data.js');
const listing = require('../models/listings');

const mongoUrl = process.env.MONGO_URL || process.env.MONGO_URI;


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
    console.error('Set the MONGO_URL or MONGO_URI environment variable to your MongoDB Atlas connection string.');
    console.error(err.message);
    process.exit(1);
  });

if (!mongoUrl) {
  console.error('Missing MongoDB connection string.');
  console.error('Set the MONGO_URL or MONGO_URI environment variable to your MongoDB Atlas connection string.');
  process.exit(1);
}

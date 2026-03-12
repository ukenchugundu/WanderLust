const express = require('express');
const app = express();
const mongoose = require('mongoose');
const listing = require('./models/listings');
const path = require('path');
const mongoUrl = process.env.MONGO_URL || 'mongodb://127.0.0.1:27017/Wanderlust';
const port = process.env.PORT || 3000;
const methodoverride = require('method-override');
const ejs = require('ejs-mate');

async function main() {
  await mongoose.connect(mongoUrl);
  console.log('Connected to MongoDB');

  app.listen(port,() => {
    console.log(`Server is running on port ${port}`);
  });
}

main().catch((err) => {
  console.error(`Error connecting to MongoDB at ${mongoUrl}`);
  console.error('Start MongoDB locally or set the MONGO_URL environment variable.');
  console.error(err.message);
  process.exit(1);
});

app.get('/testlistenings',async(req,res) => {
  const samplelisting = new listing ({
    title : "Beautiful Beach House",
    description : "A stunning beach house with breathtaking ocean views, perfect for a relaxing getaway.",
    // image : "https://images.unsplash.com/photo-1506744038136-46273834b3fb?ixlib=rb-4.0.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1200&q=80",
    price : 500,
    Location : "Malibu",
    Country : "USA",
  });
  await samplelisting.save();
  console.log("Sample listing saved to database");
  res.send("Sample listing saved to database");

})
app.get('/', (req,res) => {
  res.send("Hello World");
});




app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({extended : true}));
app.use(methodoverride('_method'));
app.engine('ejs', ejs);

// Index Route
app.get('/listings', async (req,res) => {
  const alllistings = await listing.find({})
  res.render("./listings/index.ejs", {alllistings});
})

app.get('/listings/new', (req,res) => {
  res.render("./listings/new.ejs");
})

// Show Route 
app.get('/listings/:id', async (req,res) =>{
   let {id} = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).send('Listing not found');
    }
    const foundListing = await listing.findById(id);
    if (!foundListing) {
      return res.status(404).send('Listing not found');
    }
    res.render("./listings/show.ejs", {listing: foundListing});
})
app.get('/listing/:id', (req,res) => {
  let {id} = req.params;
  res.redirect(`/listings/${id}`);
})

app.post('/listings', async (req,res) => {
  let {title, description, price, location, country, image} = req.body;
  let newListing = new listing({
    title,
    description,
    price,
    location,
    country,
    image : image && image.trim() ? { url: image.trim() } : undefined,
  });
  // console.log(newListing);
  await newListing.save();
  res.redirect('/listings');
})


app.get('/listings/:id/edit', async (req, res) => {
  let { id } = req.params;
  const foundListing = await listing.findById(id);
  res.render('./listings/edit.ejs', { listing: foundListing });
})
app.put('/listings/:id', async (req, res) => {
  let { id } = req.params;
  let { title, description, price, location, country, image } = req.body;
  let updatedListing = {
    title,
    description,
    price,
    location,
    country,
    image: image && image.trim() ? { url: image.trim() } : undefined,
  };
  await listing.findByIdAndUpdate(id, updatedListing);
  res.redirect(`/listings/${id}`);
})

//Delete Route
app.delete('/listings/:id', async (req, res) => {
  let { id } = req.params;
  let deletedListing = await listing.findByIdAndDelete(id);
  console.log(`Deleted listing ${deletedListing}`);
  res.redirect('/listings');
})


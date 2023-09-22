const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion,ObjectId  } = require('mongodb');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000;


//middle ware
app.use(cors());
app.use(express.json());



// db connection

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.zdp7af1.mongodb.net/?retryWrites=true&w=majority`;

// console.log(uri)
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    }
  });
async function run() {
  try {
    await client.connect(); 
    // const blogsCollection = client.db("psychologyBuzz").collection("blogs");
    const housesCollection = client.db("rentgo").collection("houses");
    const usersCollection = client.db("rentgo").collection("users");

    app.get('/properties', async (req, res) => {
        const query = {};
        const houses = await housesCollection.find(query).toArray();
        res.send(houses);
    });

    app.get('/propertyDetails/:id', async (req, res) => {
        const id = req.params.id;
        const query = {_id: ObjectId(id)};
        const house = await housesCollection.findOne(query);
        res.send(house);
    });

    app.get("/propertyDetails/:id/review", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const property = await housesCollection.findOne(filter);
      const comment = await property.review;
      res.send(comment);
    });

    app.put("/propertyDetails/:id/review", async(req, res) =>{
      const id = req.params.id;
      const review = req.body;
      const filter = { _id: ObjectId(id) }
      const property = await housesCollection.findOne(filter);
      const reviews = property.review;
      const newReviews = [...reviews, review];
      const option = { upsert: true };
      const updatedDoc = {
        $set: {
          review: newReviews,
        },
      };
      const result = await housesCollection.updateOne(
        filter,
        updatedDoc,
        option
      );
      res.send(result);
    })
   
  }
  finally{

  }
}
run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.listen(port, () => {
  console.log(`RentGo Server on port ${port}`)
})
const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion,ObjectId  } = require('mongodb');
require('dotenv').config();
const jwt = require('jsonwebtoken')
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

  function verifyJWT(req,res,next){
    const authHeader = req.headers.authorization;
    if(!authHeader){
      return res.status(401).send('unauthorized access')
    }
  
    const token = authHeader.split(' ')[1];
    
    jwt.verify(token, process.env.ACCESS_TOKEN, function(err, decoded){
      if(err){
        return res.status(403).send({message: 'forbidden access'})
      }
      req.decoded = decoded;
      next();
    })
  }

async function run() {
  try {
    await client.connect(); 
    const housesCollection = client.db("rentgo").collection("houses");
    const usersCollection = client.db("rentgo").collection("users");
    const bookingsCollection = client.db("rentgo").collection("bookings");
    const transportBookingCollection = client.db("rentgo").collection("transportBooking");
    const wishListCollection = client.db("rentgo").collection("wishlist");

    app.get('/jwt', async(req, res) => {
      const email = req.query.email;
      const query = {
        email: email
      };

      const user = await usersCollection.findOne(query);
      if(user) {
        const token = jwt.sign({email}, process.env.ACCESS_TOKEN, {
          expiresIn: "1h",
        })
        return res.send({accessToken: token})
      }
      res.status(403).send({accessToken: ""})
    });

    // Note: Make sure you use verifyAdmin after verifyJWT
    const verifyAdmin = async (req, res, next) => {
      const decodedEmail = req.decoded.email;
      const query = { email: decodedEmail };
      const user = await usersCollection.findOne(query);
      if (user?.role !== "admin") {
        return res.status(403).send({ message: "forbidden access" });
      }
      next();
    };

    app.get('/properties', async (req, res) => {
        const search = req.query;
        console.log(search)
        const city = await req.query.city;
        const area =await req.query.area;
        const type =await req.query.type;
        if(city){
          const query = {
            city : city,
            area: area,
            propertyType: type,
            isRent: true
          }
          const houses = await housesCollection.find(query).toArray();
          return res.send(houses)
        }
        else{
          const query = {isRent: true};
        const houses = await housesCollection.find(query).toArray();
        res.send(houses);
        }
    });

    app.post("/properties", async (req, res) => {
      const property = req.body;
      const result = await housesCollection.insertOne(property);
      res.send(result);
    })

    app.get("/searchProperty", async (req, res) => {
      const query = req.query;
      console.log(query);
    })

    app.get("/myProperty", async (req, res) => {
      const email = req.query.email;
      const query = {ownerEmail: email};
      const property =await housesCollection.find(query).toArray();
      res.send(property);
    })

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
    });

    app.put("/properties/update/:isRent", async (req, res) => {
      const isRent = req.params.isRent;
      const id = req.query.id;
      const filter = { _id: ObjectId(id) }
      const property = await housesCollection.findOne(filter);
      const option = { upsert: true };
      let updatedDoc = {};
      if( isRent === 'hide'){
        updatedDoc = {
          $set: {
            isRent: false,
          },
        };
      }else{
        updatedDoc = {
          $set: {
            isRent: true,
          },
        };
      }
      const result = await housesCollection.updateOne(
        filter,
        updatedDoc,
        option
      );
      res.send({acknowledged: true});
    })

    // booking related code
    app.post("/bookings", async (req, res) => {
      console.log("booking api is called");
      const booking = req.body;
      const query = {
        email: booking.email,
        propertyId: booking.propertyId
      };
      const alreadyBooked = await bookingsCollection.find(query).toArray();
      if (alreadyBooked.length) {
        const message = `You already have a booking on this property`;
        return res.send({ acknowledged: false, message });
      }
      const result = await bookingsCollection.insertOne(booking);
      res.send({acknowledged: true});
    });

    app.get("/bookings", async (req, res) => {
      const email = req.query.email;
      // const decodedEmail = req.decoded.email;

      // if(email !== decodedEmail){
      //   return res.status(403).send("forbidden access");
      // }
      const query = {email: email};
      const booking = await bookingsCollection.find(query).toArray();
      res.send(booking)
    });

    app.get("/allBookings", async (req, res) => {
      const query = {};
      const booking = await bookingsCollection.find(query).toArray();
      res.send(booking)
    });
    app.get('/myPropertyBooking', async (req, res) => {
      const email = req.query.email;
      const query = {authorEmail: email};
      const result = await bookingsCollection.find(query).toArray();
      res.send(result);
    })

    app.get("/transportBooking", async (req, res) => {
      const email = req.query.email;
      // const decodedEmail = req.decoded.email;

      // if(email !== decodedEmail){
      //   return res.status(403).send("forbidden access");
      // }
      const query = {userEmail: email};
      const booking = await transportBookingCollection.find(query).toArray();
      res.send(booking)
    });

    app.get("/allTransportBookings", async (req, res) => {
      const query = {};
      const booking = await transportBookingCollection.find(query).toArray();
      res.send(booking);
    })

    app.post("/transportBooking", async(req, res) =>{
      const booking = req.body;
    //  const query = {
    //     userEmail: booking.userEmail
    //   };
    //   const alreadyBooked = await transportBookingCollection.find(query).toArray();
    //   if (alreadyBooked.length) {
    //     const message = `You already have a booking on this property`;
    //     return res.send({ acknowledged: false, message });
    //   }
      const result = await transportBookingCollection.insertOne(booking);
      res.send({acknowledged: true}); 
    })

    // USER CODE
    

    app.get("/users", async (req, res) => {
      const query = {};
      const user = await usersCollection.find(query).toArray();
      res.send(user);
    })

    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = {
        email: user.email
      };
      const alreadyBooked = await usersCollection.find(query).toArray();
      if (alreadyBooked.length) {
        const message = `You already have a booking on this property`;
        return res.send({ acknowledged: false, message });
      }
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    app.get("/user/admin/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      res.send({ isAdmin: user?.role === "admin" });
    });


    app.get("/user/owner/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      res.send({ isOwner: user?.role === "owner" });
    });

    app.get("/user/request/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      res.send({ isOwner: user?.role === "request" });
    });

    app.put("/user/update/:role", async(req, res) =>{
      const email = req.query.email;
      console.log(email)
      const role = req.params.role;
      const filter = { email: email }
      const users = await usersCollection.findOne(filter);
      const option = { upsert: true };
      if(role === 'request'){
        const updatedDoc = {
          $set: {
            role: role,
          },
        };
        const result = await usersCollection.updateOne(
          filter,
          updatedDoc,
          option
        );
        return res.send({acknowledged: true});
      }
      else if(role === 'confirm'){
        const updatedDoc = {
          $set: {
            role: 'owner',
          },
        };
        const result = await usersCollection.updateOne(
          filter,
          updatedDoc,
          option
        );
        return res.send({acknowledged: true});
      }
      else{
        const updatedDoc = {
          $set: {
            role: 'user',
          },
        };
        const result = await usersCollection.updateOne(
          filter,
          updatedDoc,
          option
        );
        return res.send({acknowledged: true});
      }
    });

    // WishList

    app.get('/wishlist', async(req, res) => {
      const email = req.query.email;
      const properties = await housesCollection.find({}).toArray();
      let wishlist = [];
      const wishlistQuery = {email: email};
      const mylist = await wishListCollection.find(wishlistQuery).toArray();

      properties.forEach(async (property) =>{
        mylist.forEach(li => {
          if(JSON.stringify(property._id) === JSON.stringify(li.propertyId)){
          wishlist = [...wishlist, property]
          }
        })
      })
      res.send(wishlist)
    })

    app.post("/wishlist", async(req,res) => {
      // const email = req.query.
      const list = req.body;
      const query = {
        email: list.email,
        propertyId: list.propertyId
      };
      const alreadyBooked = await wishListCollection.find(query).toArray();
      if (alreadyBooked.length) {
        const message = `Already have this property in your wishlist`;
        return res.send({ acknowledged: false, message });
      }
      const result = wishListCollection.insertOne(list);
      res.send({acknowledged: true});
    })

    // temporary to update a field
    // app.get('/addIsRent', async(req, res) => {
    //     const filter = {};
    //     const option = { upsert : true };
    //     const updatedDoc = {
    //         $set: {
    //          propertyImage: 'https://i.ibb.co/sPJChqL/property-header-1.jpg'
    //         }
    //     }
    //     const result = await bookingsCollection.updateMany(filter, updatedDoc, option);
    //     res.send(result);
    // })
   
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
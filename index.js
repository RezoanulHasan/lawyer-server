//for express
const express = require('express');
const app = express();
//foe data cors policy
var cors = require('cors');
//for dotenv
require ('dotenv').config();
//for   mongodb
const { MongoClient, ServerApiVersion, ObjectId} = require('mongodb');
//for stipe payment
const stripe = require('stripe')(process.env.PAYMENT_SECRET_KEY)
//for email sending
const nodemailer = require("nodemailer");
//for jwt token
const jwt = require('jsonwebtoken');
const port = process.env.PORT || 5000;


// use   middleware
app.use(express.json());
app.use(cors());


// Send Email
const sendMail = (emailData, emailAddress) => {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL,
        pass: process.env.PASS,
      },
    })
    // verify connection configuration
    transporter.verify(function (error, success) {
      if (error) {
        console.log(error)
      } else {
        console.log('Server is ready to take our messages')
      }
    })
  
    const mailOptions = {
      from: process.env.EMAIL,
      to: emailAddress,
      subject: emailData?.subject,
      html:    `
      <div>
      <label tabIndex={0} className="btn btn-ghost btn-circle avatar">
      <div className="w-12 rounded-full">
       <img src="" alt="" />
      </div>
    </label>
     <h2> Dear Customer  </h2>
  
  <h3> Congratulations! Your payment has been successfully processed, securing your spot at Sports Academy. Prepare to embark on a transformation sports journey that will unlock your full potential!</h3>
  
      </div> 
  
      `     , 
    }

    transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
        console.log(error)
      } else {
        console.log('Email sent: ' + info.response)
      }
    })
  }


   //(verifyJWT)
const verifyJWT = (req, res, next) => {
    const authorization = req.headers.authorization;
    if (!authorization) {
      return res.status(401).send({ error: true, message: 'unauthorized access' });
    }
    // bearer token
    const token = authorization.split(' ')[1];
  
    jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
      if (err) {
        return res.status(401).send({ error: true, message: 'unauthorized access' })
      }
      req.decoded = decoded;
      next();
    })
  }
 

  //  mongodb user and pass
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.aatv5yk.mongodb.net/?retryWrites=true&w=majority`;


//Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    }
  });
  
  async function run() {
  
  
    try {
      // Connect the client to the server	(optional starting in v4.7)
      //await client.connect();
  
  //mongodb databage
  const contactCollection = client.db('lawyerHaring').collection('contacts');
  const usersCollection = client.db("lawyerHaring").collection("users");

     //*---------------------------using jwt--------------------------*

     app.post('/jwt', (req, res) => {
        const user = req.body;
        const token = jwt.sign(user, process.env.ACCESS_TOKEN, { expiresIn: '7d' })
        res.send({ token })
      })
           // Warning: use verifyJWT before using ( verifyAdmin)
           const verifyAdmin = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email }
            const user = await usersCollection.findOne(query);
            if (user?.role !== 'admin') {
              return res.status(403).send({ error: true, message: 'forbidden message' });
            }
            next();

  }




//*---------------------------users--------------------------*
// Get all users
app.get('/users',verifyJWT, verifyAdmin, async (req, res) => {
    const result = await usersCollection.find().toArray();
    res.send(result);
  });
  
  
  
  // Register a new user
  app.post('/users', async (req, res) => {
    const user = req.body;
    const query = { email: user.email };
    const existingUser = await usersCollection.findOne(query);
    if (existingUser) {
      return res.send({ message: 'User already exists' });
    }
    const result = await usersCollection.insertOne(user);
    res.send(result);
  });
  
  
  
  // Verify if a user is an admin
  //verifyJWT
  app.get('/users/admin/:email', verifyJWT, async (req, res) => {
    const email = req.params.email;
    if (req.decoded.email !== email) {
      res.send({ admin: false });
    }
  // email cheak
    const query = { email: email };
    const user = await usersCollection.findOne(query);
     // check admin
    const result = { admin: user?.role === 'admin' };
    res.send(result);
  });
  
  // Promote a user to admin
  app.patch('/users/admin/:id', async (req, res) => {
    const id = req.params.id;
    const filter = { _id: new ObjectId(id) };
    const updateDoc = {
      $set: {
        role: 'admin',
      },
    };
  
    const result = await usersCollection.updateOne(filter, updateDoc);
    res.send(result);
  });
  
  
  
  // Verify if a user is an lawyer
  app.get('/users/lawyer/:email', verifyJWT, async (req, res) => {
    const email = req.params.email;
    if (req.decoded.email !== email) {
      res.send({ instructor: false });
    }
  // email cheak
    const query = { email: email };
    const user = await usersCollection.findOne(query);
      // check instructor
    const result = { instructor: user?.role === 'lawyer' };
    res.send(result);
  });
  
  // Promote a user to instructor
  app.patch('/users/instructor/:id', async (req, res) => {
    const id = req.params.id;
    const filter = { _id: new ObjectId(id) };
    const updateDoc = {
      $set: {
        role: 'lawyer',
      },
    };
    const result = await usersCollection.updateOne(filter, updateDoc);
    res.send(result);
  });
  
  // Delete a user
  app.delete('/users/:id', async (req, res) => {
    const id = req.params.id;
    const query = { _id: new ObjectId(id) };
    const result = await usersCollection.deleteOne(query);
    res.send(result);
  });
  



   //*---------------------------contacts--------------------------*

    //get data contacts  from  client
    app.post('/contacts', async( req, res) => {
        const contact = req.body;
        console.log(contact);
        const result = await contactCollection.insertOne(contact);
        res.send(result);
    })
    
    
  
    //SHOW contacts  allDATA   IN SERVER SITE 
    app.get('/contacts', async( req, res) => {
      const cursor = contactCollection.find();
          const result = await cursor.toArray();
      res.send(result);
  })
  
  //SHOW contacts  DATA   IN SERVER SITE  BY ID  
  app.get('/contacts/:id', async(req, res) => {
    const id = req.params.id;
    const query = {_id: new ObjectId(id)}
    const result = await contactCollection.findOne(query);
    res.send(result);
  
  
  })  







           // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    //await client.close();
  }
}
run().catch(console.dir);app.get('/', (req, res) => {
    res.send('!welcome to LawyerHiring')
  })
  
  
  app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
  })
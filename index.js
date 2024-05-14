const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const express = require("express");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 5000;
require("dotenv").config();
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");

// middlewares
app.use(express.json());
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
      "https://vix-career.web.app/",
      "https://vix-career.firebaseapp.com/",
    ],
    credentials: true,
  })
);
app.use(cookieParser());

// verify jwt middleware
const verifyToken = async (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) {
    return res.status(401).send({ message: "Unauthorized access" });
  }
  jwt.verify(token, process.env.ACESS_TOKEN_SECRET, (err, decoded) => {
    // err
    if (err) {
      return res.status(401).send({ message: "unauthorized" });
    }
    console.log("value token", decoded);
    req.user = decoded;
    next();
  });
};

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ffkzbfb.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    const jobsCollection = client.db("vixCarrer").collection("jobs");
    const jobApplyCollection = client.db("vixCarrer").collection("job-Apply");
    const companiesCollection = client.db("vixCarrer").collection("companies");
    const blogsCollection = client.db("vixCarrer").collection("blogs");

    app.get("/", async (req, res) => {
      res.send("server is running");
    });

    // jwt Token
    app.post("/jwt", async (req, res) => {
      const email = req.body;
      const token = jwt.sign(email, process.env.ACESS_TOKEN_SECRET, {
        expiresIn: "30d",
      });
      res
        .cookie("token", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        })
        .send({ success: true });
    });

    // Clear Jwt token for logout a user
    app.get("/logout", (req, res) => {
      res
        .clearCookie("token", {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
          maxAge: 0,
        })
        .send({ success: true });
    });

    // create a job
    app.post("/all-jobs", async (req, res) => {
      const jobData = req.body;
      const result = await jobsCollection.insertOne(jobData);
      res.send(result);
    });

    // get all job data
    app.get("/all-jobs", async (req, res) => {
      const page = parseInt(req.query.page);
      const size = parseInt(req.query.size);
      const result = await jobsCollection
        .find()
        .skip(page * size)
        .limit(size)
        .toArray();
      res.send(result);
    });

    // get a single job details based on id
    app.get("/job/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await jobsCollection.findOne(query);
      res.send(result);
    });

    // get all jobs based on email
    app.get("/all-jobs/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const result = await jobsCollection.find(query).toArray();
      res.send(result);
    });

    // update job data
    app.put("/job/:id", async (req, res) => {
      const id = req.params.id;
      const jobData = req.body;
      const query = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          ...jobData,
        },
      };
      const result = await jobsCollection.updateOne(query, updateDoc, options);
      res.send(result);
    });

    // delete a job data
    app.delete("/job/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await jobsCollection.deleteOne(query);
      res.send(result);
    });

    // save job application in database
    app.post("/job-apply", async (req, res) => {
      const applyData = req.body;

      // check duplicatr req
      const query = {
        email: applyData.email,
        jobId: applyData.jobId,
      };
      const alreadyApply = await jobApplyCollection.findOne(query);
      if (alreadyApply) {
        return res.status(400).send("You have already Applied on this Job");
      }

      const result = await jobApplyCollection.insertOne(applyData);

      // update total applied on job
      const updateDoc = {
        $inc: { job_applicants: 1 },
      };
      const applyQuery = { _id: new ObjectId(applyData.jobId) };
      const updateCount = await jobsCollection.updateOne(applyQuery, updateDoc);
      console.log(updateCount);
      res.send(result);
    });

    // get all job apply for a user by email from db
    app.get("/my-apply/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const result = await jobApplyCollection.find(query).toArray();
      res.send(result);
    });

    // get all companies data
    app.get("/companies", async (req, res) => {
      const result = await companiesCollection.find().toArray();
      res.send(result);
    });

    // get all blog data
    app.get("/blogs", async (req, res) => {
      const result = await blogsCollection.find().toArray();
      res.send(result);
    });

    // get a specific data based on id
    app.get("/blog/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await blogsCollection.findOne(query);
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`server is running on poer ${port}`);
});

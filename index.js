const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const express = require("express");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 5000;
require("dotenv").config();

// middlewares
app.use(express.json());
app.use(cors());

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

    app.get("/", async (req, res) => {
      res.send("server is running");
    });

    // create a job
    app.post("/all-jobs", async (req, res) => {
      const jobData = req.body;
      const result = await jobsCollection.insertOne(jobData);
      res.send(result);
    });

    // get all job data
    app.get("/all-jobs", async (req, res) => {
      const result = await jobsCollection.find().toArray();
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
    app.get("/all-jobs/:email", async (req, res) => {
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

      // const query = {
      //   email: applyData.email,
      //   jobId: applyData.jobId,
      // };
      // const alreadyApply = await jobApplyCollection.find(query);
      // if (alreadyApply) {
      //   return res.status(400).send("You have already Applied on this Job");
      // }

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

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
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

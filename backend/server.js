const express = require('express');
const app = express();
const cors = require('cors');

const session = require('express-session');
const MongoStore = require('connect-mongo');

require('dotenv').config({path: "./config.env"}); // Load environment variables from a .env file into process.env

const port = process.env.PORT; // go to .env file and get the port number



// Middleware
app.use(cors(
    {origin: 'http://localhost:3000',
     methods: ['GET', 'POST', 'PUT', 'DELETE'],
     credentials: true,
     optionsSuccessStatus: 204,
     allowedHeaders: ['Content-Type', 'Authorization'],
    }
)); // Enable CORS Requests from localhost:3000


app.use(session({
    secret: 'keyboard cat',
    saveUninitialized: false,
    resave: false,
    store: MongoStore.create({mongoUrl: process.env.ATLAS_URI}),
}))

app.use(express.json()); // get data in json format


app.use(require('./routes/record')); // use the record.js file to handle the routes


const dbo = require('./db/conn'); // connect to database




app.get('/', (req, res) => {

    res.send('Hello World!');
});

app.listen(port, () => {
    dbo.connectToServer(function(err) {
        if(err) {
            console.err(err);
        }
    });
    console.log(`Server is running on port ${port}`);
});
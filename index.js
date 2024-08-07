// Import all neccessary items
import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import bcrypt from "bcrypt";
import passport from "passport";
import {Strategy} from "passport-local";
import session from "express-session";
import env from "dotenv";

// Create an express app
const app = express();
const port = 3000;

// Salt rounds for Bcrypt
const saltRounds = 12;

// Start the env process
env.config();

// Use cookies
const cookieAgeDays = 1;
app.use(
    session({
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: true,
        cookie: {
            maxAge: 1000 * 60 * 60 * 24 * cookieAgeDays,
        }
    })
)

// Bodyparser and file location
app.use(bodyParser.urlencoded({extended:true}));
app.use(express.static("public"));

// Initialize the passport
app.use(passport.initialize());
app.use(passport.session());

// Connect to the database
const db = new pg.Client({
    user: process.env.PG_USER,
    host: process.env.PG_HOST,
    database: process.env.PG_DATABASE,
    password: process.env.PG_PASSWORD,
    port: process.env.PG_PORT,
});
db.connect();

// GET routes

app.get("/", (req, res) => {
    res.render("home.ejs");
})

// Start the server
app.listen(port, ()=>{
    console.log(`Server running on http://localhost:${port}`)
});
// --------------------- Getting Everything Ready --------------------- //

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

// --------------------- User Data Functions --------------------- //

import userdata from "./userdata.js";

// --------------------- Connecting to the Routes --------------------- //

// Generic GET routes
/**
 * Creates a GET route for the given path and renders the corresponding
 * EJS file with the data.
 * 
 * @param {string} path The path to create a GET path to
 * @param {string} rend The name of the EJS file to render
 * @param {func} optFunc `Optional` The function to get the needed data which then 
 * we transfer to the EJS file. The default is getAllData 
 */
async function getPath(path, rend, optFunc = userdata.getAllData) {
    app.get(path, async (req, res) => {
        const data = await optFunc(req);
        res.render(rend, {data: data});
    })
}


/**
 * Creates a GET route for the given path and renders the corresponding
 * EJS file with the data. The path is only accessed if the user is authenticated,
 * otherwise, it redirects to another given path.
 * 
 * @param {string} path The path to create a GET path to.
 * @param {string} rend The name of the EJS file to render.
 * @param {string} redirectPath The path to redirect the user if they are not authenticated.
 * @param {func} optFunc `Optional` The function to get the needed data which then 
 * we transfer to the EJS file. The default is getAllData 
 */
async function getPathAuth(path, rend, redirectPath, optFunc = userdata.getAllData) {
    app.get(path, async (req, res) => {
        if (req.isAuthenticated()) {
            const data = await optFunc(req);
            res.render(rend, {data: data});
        } else {
            res.redirect(redirectPath);
        }
    })
}

// GET routes
getPath("/", "home.ejs");
getPath("/login", "login.ejs");
getPath("/register", "register.ejs");

// GET routes that require authentication
getPathAuth("/user", "user.ejs", "/login");

// Logging out
app.get("/logout", (req, res) => {
    req.logOut(function (err) {
        if (err) {return next(err);}
        res.redirect("/");
    });
});

// Registering
app.post("/register", async (req, res) => {
    // Get the email and the password
    const email = req.body.username;
    const password = req.body.password;
    const repeatpassword = req.body.repeatpassword;

    // Big chunk of try and catch
    try {
        // Check if the passwords match
        if (password !== repeatpassword) {
            // If password and repeat password don't match, throw an error
            res.redirect("/register");
        }

        // Check if user is already registered
        const checkResult = await db.query(
            "SELECT * FROM person WHERE email=$1",
            [email]
        );
        
        // If already registered, redirect to login
        if (checkResult.rows.length > 0) {
            req.redirect("/login");
        }

        // If not, hash the password and store the data
        bcrypt.hash(password, saltRounds, async (err, hash) =>{

            // If there is an error, throw it.
            if (err) {console.error("error hashing: ", err)}
            
            // If there is no error, insert the given information
            const result = await db.query(
                "INSERT INTO person (email, password) VALUES ($1, $2) RETURNING *",
                [email, hash]
            );
            const user = result.rows[0];

            // Also create a display name and a pfp link for the user and store as data
            const displayName = "user" + user.id;
            const data = await db.query(
                "INSERT INTO person_data (id, pfplink, displayname) VALUES ($1, $2, $3) RETURNING *",
                [user.id, "/icons/user-holder.png", displayName]
            )

            // Login the user
            req.login(user, (err) => {
                console.log("user has been registered successfully with the display name of ", displayName);
                res.redirect("/user");
            })
        })

    } catch (err) {
        console.log(err);
    }
    
})

// Logging in
app.post("/login", passport.authenticate("local", {
    successRedirect: "/user",
    failureRedirect: "/login",
}));

// Passport Strategy (Local)
passport.use("local", new Strategy(

    // Make sure that the names are username and password in login and register pages
    async function verify(username, password, cb) {
        try {
            // Get user data
            const result = await db.query(
                "SELECT * FROM person WHERE email=$1",
                [username]
            );

            // If user not found, return a callback
            if (result.rows.length === 0) {
                return cb("User not found");
            }

            // If such user does exist, compare the bcrypt hashes
            const user = result.rows[0];
            const storedHash = user.password;
            
            bcrypt.compare(password, storedHash, (err, valid) => {
                // If there was an error, deal with it
                if (err) {
                    return cb(err);
                }

                // If the passwords don't match, return false
                if (!valid) {
                    return cb(null, false);
                } 

                // Return the user if everything goes well
                return cb(null, user);
            });
            

        } catch (err) {
            console.log(err);
        }
    }
))

// Passport Serialization
passport.serializeUser((user, cb) => {
    cb(null, user);
});

passport.deserializeUser((user, cb) => {
    cb(null, user);
})

// Start the server
app.listen(port, ()=>{
    console.log(`Server running on http://localhost:${port}`)
});
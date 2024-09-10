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
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    ssl: {
        rejectUnauthorized: true,
        ca: process.env.DB_CERT,
      },
});
db.connect();

// --------------------- User Data Functions --------------------- //

import userdata from "./userdata.js";

// --------------------- Movie Data Functions --------------------- //

import moviedata from "./moviedata.js";

// --------------------- SQL Data Functions --------------------- //

import SQLdata from "./SQLdata.js";

// --------------------- Connecting to the Routes --------------------- //

// Replacemant data for the movies
const movieReplacement = {
    data: {
        id: 1,
        original_title: "The Shining",
        summary: "A horror and a thriller movie about the shining",
        poster: {
        file_location:"/icons/shining-poster.png"
        },
    }
}

/**
 * Takes the request and returns one object of all of the needed data
 * @param {Request} req The request
 * @returns {object}
 */
async function getRequestData(req) {
    // Get the data according to the query
    const currentUser = await userdata.getAllData(req);
    const queryUser = await userdata.getAllDataById(req.query.userid);
    let movieData = await moviedata.getMovieData(req.query.movieid);
    if (movieData.data === undefined) {
        movieData = movieReplacement;
    }
    const queryReview = await SQLdata.getPostData(req.query.postid);
    const allReviews = await SQLdata.getAllPosts();

    // Construct a new data object with all of the above data
    const data = {
        currentUser: currentUser,
        queryUser: queryUser,
        queryReview: queryReview,
        movieData: movieData,
        allReviews: allReviews,
    }

    // Return the data
    return data;
}

/**
 *  Takes the word of the route and the ejs file (which, obviously, should match) and renders it.
 *  The optional paramters are if the autherization is needed for this route. If it is,
 *  then the user is redirected to the other given route.
 * @param {string} word The name of the ejs file and the route.
 * @param {boolean} authNeeded `Optional` Is authorization needed? Default is `false`
 * @param {string} redirectRoute `Optional` Where do we redirect? Default is `/login`
 */
async function getRoute(word, authNeeded = false, redirectRoute = "/login") {
    // Split the word into the path and the render strings
    const path = (word !== "home") ? `/${word}` : `/`;
    const rend = `${word}.ejs`

    // Get the route
    app.get(path, async (req, res) => {
        // If auth needed, check if the user is not authenticated and redirect
        if (authNeeded && !req.isAuthenticated()) {
            res.redirect(redirectRoute);
        }

        // Get the data from the request
        const data = await getRequestData(req);

        // Now render
        res.render(rend, {data: data});
    })
}

// GET routes
getRoute("home");
getRoute("login");
getRoute("register");
getRoute("watchedit");
getRoute("review");
getRoute("movie");

// GET routes that require authentication
getRoute("user", true);
getRoute("user-settings", true);


// --------------------- POST to get all of the movies --------------------- //

app.post("/search", async (req, res) => {
    // What are we searching for?
    const searchFor = req.body.searching;

    // Search for the given movie
    const result = await moviedata.getByTitle(searchFor);
    
    // render the search results by passing the array
    res.render("search.ejs", {data: await userdata.getAllData(req), moviedata: result.data});
})

// --------------------- POST to update information --------------------- //

// Update the display name
app.post("/change-display-name", async (req, res) => {
    // Check if the user is verified, just in case
    if (!req.isAuthenticated) {
        res.redirect("/login");
    }

    // Check if the passwords match
    const typedPassword = req.body.password;
    const hashedPassword = req.user.password;

    bcrypt.compare(typedPassword, hashedPassword, async (err, valid) => {
        // if there was an error, throw the error
        if (err) {
            console.error(err);
        }

        // Otherwise, if the passwords match, update the information
        if (valid===true) {
            const newDisplayName = req.body.displayname;
            await db.query
            (
                "UPDATE person_data SET displayname = $1 WHERE id = $2", 
                [newDisplayName, req.user.id]
            )
            res.redirect("/user");
        } else {
            res.render("user-settings.ejs", {data: await userdata.getAllData(req)});
        }
    })
})

// Update the pfp link
app.post("/change-photo", async (req, res) => {
    // Check if the user is verified, just in case
    if (!req.isAuthenticated) {
        res.redirect("/login");
    }

    // Check if the passwords match
    const typedPassword = req.body.password;
    const hashedPassword = req.user.password;

    bcrypt.compare(typedPassword, hashedPassword, async (err, valid) => {
        // if there was an error, throw the error
        if (err) {
            console.error(err);
        }

        // Otherwise, if the passwords match, update the information
        if (valid===true) {
            const newpfplink = req.body.pfplink;
            await db.query
            (
                "UPDATE person_data SET pfplink = $1 WHERE id = $2", 
                [newpfplink, req.user.id]
            )
            res.redirect("/user");
        } else {
            res.render("user-settings.ejs", {data: await userdata.getAllData(req)});
        }
    })
})

// Update the email adress
app.post("/change-email", async (req, res) => {
    // Check if the user is verified, just in case
    if (!req.isAuthenticated) {
        res.redirect("/login");
    }

    // Check if the passwords match
    const typedPassword = req.body.password;
    const hashedPassword = req.user.password;

    bcrypt.compare(typedPassword, hashedPassword, async (err, valid) => {
        // if there was an error, throw the error
        if (err) {
            console.error(err);
        }

        // Otherwise, if the passwords match, update the information
        if (valid===true) {
            const newEmail = req.body.username;
            await db.query
            (
                "UPDATE person SET email = $1 WHERE id = $2", 
                [newEmail, req.user.id]
            )
            res.redirect("/user");
        } else {
            res.render("user-settings.ejs", {data: await userdata.getAllData(req)});
        }
    })
})

// Update the password
app.post("/change-password", async (req, res) => {
    // Check if the user is verified, just in case
    if (!req.isAuthenticated) {
        res.redirect("/login");
    }

    // Check if the passwords match
    const typedPassword = req.body.oldpassword;
    const hashedPassword = req.user.password;

    bcrypt.compare(typedPassword, hashedPassword, async (err, valid) => {
        // if there was an error, throw the error
        if (err) {
            console.error(err);
        }

        // If the old password is incorrect, deal with it
        if (!valid) {
            res.render("user-settings.ejs", {data: await userdata.getAllData(req)});
        }

        // Check if the new passwords match
        const newPassword = req.body.newpassword;
        const repeatPassword = req.body.repeatpassword;

        if (newPassword === repeatPassword) {

            // If it does match, encrypt the password and save it
            bcrypt.hash(newPassword, saltRounds, async (err, hash) => {

                // If there is an error, throw it
                if (err) {
                    console.error("error while hashing the new password");
                }

                // If there is no error, update the password
                await db.query
                (
                    "UPDATE person SET password = $1 WHERE id = $2", 
                    [newPassword, req.user.id]
                )

                res.redirect("/user");
            })
            
        }
    })
})

// Deleting the account
app.get("/delete-account-permanent", async (req, res) => {
    // Check if the user is actually logged in
    if (!req.isAuthenticated) {
        res.redirect("/login");
    } 

    // If they are logged in, start deleting their data
    // First delete the posts, comments, likes and favourites
    await db.query("DELETE FROM comment_like WHERE person_id=$1;", [req.user.id]);
    await db.query("DELETE FROM post_like WHERE person_id=$1;", [req.user.id]);
    await db.query("DELETE FROM favourites WHERE person_id=$1;", [req.user.id]);
    await db.query("DELETE FROM comment WHERE person_id=$1;", [req.user.id]);
    await db.query("DELETE FROM post WHERE person_id=$1;", [req.user.id]);

    // Now delete the person data
    await db.query("DELETE FROM person_data WHERE id=$1;", [req.user.id]);

    // And finally, delete the person itself
    await db.query("DELETE FROM person WHERE id=$1", [req.user.id]);

    // And when everything is done, redirect the user to /register
    res.redirect("/logout");
})

app.post("/delete-account", async (req, res) => {
    // Check if the user is verified, just in case
    if (!req.isAuthenticated) {
        res.redirect("/login");
    } else {

    // Check if the passwords match
    const typedPassword = req.body.password;
    const hashedPassword = req.user.password;

    bcrypt.compare(typedPassword, hashedPassword, async (err, valid) => {
        // if there was an error, throw the error
        if (err) {
            console.error(err);
        }

        // If the old password is incorrect, deal with it
        if (!valid) {
            res.render("user-settings.ejs", {data: await userdata.getAllData(req)});
        }

        // If it does, render the warning
        res.render("warning.ejs", {data: await userdata.getAllData(req)});
            
    })

    }  
})

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
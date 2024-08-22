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

// Getting user data
async function getUserData(userID) {
    const result = await db.query(
        "SELECT pe.email, da.pfplink, da.displayname FROM person pe JOIN person_data da ON pe.id = da.id WHERE pe.id = $1;",
        [userID]
    );

    if (result.rowCount > 0) {
        return result.rows[0]
    }

    return null;
}

// Check if verified and if yes then return data
async function getAllData(req) {
    if (req.isAuthenticated()) {
        return getUserData(req.user.id);
    }

    return null;
}

// GET routes

app.get("/", async (req, res) => {
    res.render("home.ejs", {data: await getAllData(req)});
})

app.get("/login", async (req, res) => {
    res.render("login.ejs", {data: await getAllData(req)});
})

app.get("/register", async (req, res) => {
    res.render("register.ejs", {data: await getAllData(req)});
})

app.get("/user", async (req, res) => {
    if (req.isAuthenticated()) {
        const result = await db.query("SELECT * FROM person_data WHERE id=$1", [req.user.id])

        res.render("user.ejs", {data: result.rows[0]});
    } else {
        res.redirect("/login")
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


    try {
        // Check if the passwords match
        if (password === repeatpassword) {

            // Check if user is already registered
            const checkResult = await db.query(
                "SELECT * FROM person WHERE email=$1",
                [email]
            );
            
            if (checkResult.rows.length > 0) {
                // If already registered, redirect to login
                req.redirect("/login");
            } else {
                // If not, hash the password and store the data
                bcrypt.hash(password, saltRounds, async (err, hash) =>{
                    if (err) {console.error("error hashing: ", err)}
                    else {
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
                            console.log("user has been registered successfully");
                            res.redirect("/user");
                        })
                    }
                })
            }
        } else {
            // If password and repeat password don't match, throw an error
            res.redirect("/register");
        }

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

            if (result.rows.length > 0) {
                // If such user exists, compare the bcrypt hashes
                const user = result.rows[0];
                const storedHash = user.password;
                
                bcrypt.compare(password, storedHash, (err, valid) => {
                    if (err) {
                        return cb(err);
                    } else {
                        if (valid) {
                            // Return the user if everything goes well
                            return cb(null, user);
                        } else {
                            return cb(null, false);
                        }
                    }
                });
            } else {
                return cb("User not found");
            }

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
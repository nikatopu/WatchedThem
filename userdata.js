// Import dependencies
import pg from "pg";
import env from "dotenv";


// Start the env process
env.config();

// Connect to the database
const db = new pg.Client({
    user: process.env.PG_USER,
    host: process.env.PG_HOST,
    database: process.env.PG_DATABASE,
    password: process.env.PG_PASSWORD,
    port: process.env.PG_PORT,
});
db.connect();

// Create the user info functions
/**
 * Gets basic data about the user, like the email, the pfp link and the display name.
 * 
 * @param {number} userID The id of the user we want to get information about.
 * @returns {Promise<object>} An object containing {email, pfplink, displayname}.
 */
export async function getUserData(userID) {
    const result = await db.query(
        "SELECT pe.email, da.pfplink, da.displayname FROM person pe JOIN person_data da ON pe.id = da.id WHERE pe.id = $1;",
        [userID]
    );

    if (result.rowCount > 0) {
        return result.rows[0];
    }

    return null;
}

/**
 * Gets all of the posts created by the user in one array.
 * 
 * @param {number} userID The id of the user we want to get information about.
 * @returns {Promise<Array<object>>} An array of objects, each containing {id, movie, stars, review}.
 */
export async function getUserPosts(userID) {
    const result = await db.query(
        "SELECT id, movie, stars, review FROM post WHERE post.person_id = $1;",
        [userID]
    );

    if (result.rowCount > 0) {
        return result.rows;
    }

    return [];
}

/**
 * Gets all of the posts favourited by the user in one array.
 * 
 * @param {number} userID The id of the user we want to get information about.
 * @returns {Promise<Array<object>>} An array of objects, each containing {id, movie, stars, review}.
 */
export async function getUserFavourites(userID) {
    // Get all of the user's favourite post ids
    const result = await db.query(
        "SELECT * FROM favourites WHERE person_id = $1;",
        [userID]
    );

    // If the result has no favourites, return an empty array
    if (result.rowCount === 0) {
        return [];
    }

    // If the user has favourites, create a new array of only those posts
    let promiseArr = Array.from(
        result.rows,
        async (e) => {
            let answer = await db.query("SELECT * FROM post WHERE id=$1", [e.post_id]);
            if (answer.rowCount > 0) {
                return answer.rows[0];
            }
        }
    );

    // Wait for all promises to be complete
    const finalResult = await Promise.all(promiseArr);
    return finalResult;
}

// Check if verified and if yes then return data
/**
 * This returns all of 
 * the data of that user as one simple object.
 * 
 * @param {number} id The number of the user id
 * @returns {object} An object containing following information:
 * 
 * email: `string`,
 * pfplink: `string`,
 * displayname: `string`,
 * posts: `array`,
 * favs: `array`,
 * 
 * each of posts and favs contains: 
 * id of `number`, 
 * movie of `string`, 
 * stars of `number`, 
 * review of `string` 
 */
export async function getAllDataById(id) {
    // If the request is undefined, return null
    if (id === undefined || id <= 0) {
        return null;
    }

    // If user is authenticated, return data as a single object
    const userData = await getUserData(id);
    const userPosts = await getUserPosts(id);
    const userFavs = await getUserFavourites(id);

    const oneBigObject = {
        ...userData,
        posts: userPosts,
        favs: userFavs
    };

    return oneBigObject;
}

// Check if verified and if yes then return data
/**
 * This returns all of 
 * the data of that user as one simple object.
 * 
 * @param {Request} req The request of the GET (or any other) method.
 * @returns {object} An object containing following information:
 * 
 * email: `string`,
 * pfplink: `string`,
 * displayname: `string`,
 * posts: `array`,
 * favs: `array`,
 * 
 * each of posts and favs contains: 
 * id of `number`, 
 * movie of `string`, 
 * stars of `number`, 
 * review of `string` 
 */
export async function getAllData(req) {
    // If the request is undefined, return null
    if (req.user === undefined) {
        return null;
    }

    // Get the data
    return await getAllDataById(req.user.id);
}

const userdata = {getUserData, getUserFavourites, getUserPosts, getAllData, getAllDataById}

export default userdata;
// Import all dependencies
import pg from "pg";
import env from "dotenv";
import moviedata from "./moviedata.js";

// Start the env process
env.config();

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

/**
 * Takes in the array of post objects and sorts them 
 * by the descending order of likes and comments
 * @param {Array<object>} posts The unsorted array of posts
 * @returns {Promise<Array<object>>} The sorted array of posts
 */
async function sortPosts(posts) {
    const data = await Promise.all(posts.map(e => getPostData(e.id)).sort((a, b) => (a.likeCount + a.commentCount) - (b.likeCount + b.commentCount)));
    return data;
}

/**
 * Takes a movie title and returns all of the reviews about it
 * @param {string} title The title of the movie to get reviews about
 * @returns {Promise<Array<object>>} The array of all of the reviews as objects
 */
export async function getMovieReviews(title) {
    // Get the reviews from the database
    const result = await db.query("SELECT * FROM post WHERE movie=$1;", [title.toLowerCase()]);
    if (result.rows.length <= 0) {
        return null;
    }

    return await sortPosts(result.rows);
}

/**
 * Returns all of the posts in a descending order
 * @returns {Promise<Array<object>>}
 */
export async function getAllPosts() {
    const posts = await db.query("SELECT * FROM post");
    if (posts.rows.length <= 0) {
        return [];
    }

    return await sortPosts(posts.rows);
}

/**
 * Takes the id number and returns the data of that post
 * @param {number} id The id of the post
 * @returns {Promise<object>} `object` The object of the post
 */
export async function getPost(id) {
    const result = await db.query("SELECT * FROM post WHERE id=$1;", [id]);
    if (result.rows.length === 0) {
        return null;
    }
    return result.rows[0];
}

/**
 * Takes the post id and returns the array of all of the comments
 * @param {number} id The id of the post
 * @returns {Promise<Array<object>>} `Array<object>`  Array of the comment objects
 */
export async function getPostComments(id) {
    const result = await db.query("SELECT * FROM comment WHERE post_id=$1;", [id]);
    if (result.rows.length = 0) {return [];}
    return result.rows;
}

/**
 * Takes the post id and returns the array of all of the likes
 * @param {number} id The id of the post
 * @returns {Promise<Array<object>>} `Array<object>` Array of the like objects
 */
export async function getPostLikes(id) {
    const result = await db.query("SELECT * FROM post_like WHERE post_id=$1;", [id]);
    if (result.rows.length = 0) {return [];}
    return result.rows;
}

/**
 * Returns the author of the post
 * @param {number} id The id of the post
 * @returns {Promise<object>} `object` The person data object
 */
export async function getPostAuthor(id) {
    const user_id = await db.query("SELECT person_id FROM post WHERE id=$1;", [id]);
    if (user_id.rows.length <= 0) {
        console.log("The user id not found");
        return null;
    }

    const user = await db.query("SELECT * FROM person_data WHERE id=$1", [user_id.rows[0].person_id]);
    if (user.rows.length <= 0) {
        console.log("The user data not found");
        return null;
    }

    return user.rows[0];
}

/**
 * Takes the id of the post and returns all of the info about this post
 * in a simple object, that contains the post object, the comment and the like arrays
 * @param {number} id The id of the post
 * @returns {Promise<object>} `object` The object of the post data
 */
export async function getPostData(id) {
    if (id === undefined) {
        return null;
    }

    const the_post = await getPost(id);
    if (the_post === null) {
        console.log("No post found");
        return null;
    }

    const the_author = await getPostAuthor(id);
    if (the_author === null) {
        console.log("No author found")
        return null;
    }

    const the_likes = await getPostLikes(id);
    const the_comments = await getPostComments(id);

    const postData = {
        author: the_author,
        post: the_post,
        likes: the_likes,
        likeCount: the_likes.length,
        comments: the_comments,
        commentCount: the_comments.length,
    }

    return postData;
}


const SQLdata = {
    getMovieReviews,
    getAllPosts,
    getPost,
    getPostComments,
    getPostLikes,
    getPostAuthor,
    getPostData
}

export default SQLdata;
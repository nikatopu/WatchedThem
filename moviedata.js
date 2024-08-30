// Import all dependencies
import pg from "pg";
import env from "dotenv";
import axios from "axios";

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

// Create the constants of the api
const apiURL = "https://api.movieposterdb.com/v1";
const apiKey = process.env.MOVIE_API_KEY;
const config = {headers: { Authorization: `Bearer ${apiKey}` }};

// Getting the information
/**
 * Returns the data according to the given string.
 * @param {string} str The custom string after the URL that returns the data.
 * @returns {object}
 */
async function getData(str) {
    try {
        const result = await axios.get(apiURL + str, config);
        return result.data;
    } catch (err) {
        return err.message;
    }
}

/**
 * Returns all data of a movie from the API by using the id
 * @param {number} id The id of the movie
 * @returns {object} 
 */
export async function getMovieData(id) {
    return await getData("/movie?id=" + id);
}

/**
 * Takes a string acting as the title and then returns all of the matching movies or tv series
 * 
 * @param {string} title The title of the movie or tv series to return 
 * @returns {object} An object with the array data of all of the movies
 */
export async function getByTitle(title) {
    return await getData("/search/movies?title=" + title);
}

/**
 * Takes a string acting as the title and then returns 5 of the movies or tv series with autocompletion
 * @param {string} title The title of the movie or the tv series to autocomplete
 * @returns {object} An object with the array data of all of the autocompleted movies
 */
export async function getAutocompleteMovie(title) {
    return await getData("/autocomplete/movies?title=" + title);
}

/**
 * Gets the movie title and returns the average stars and review count.
 * 
 * @param {string} title The title of the movie to get data about
 * @returns {object} An object containing two variables - stars and reviewCount
 */
export async function getMovieStarRatingByTitle(title) {
    // Get every star rating of the movie
    const result = await db.query("SELECT stars FROM post WHERE movie=$1;", {title});

    // If the movie has not yet been rated, return 0
    if (result.rows.length <= 0) {
        return {stars: 0, reviewCount: 0};
    }

    // If the movie has ratings, get the average and return the average review and the review count
    const averageStars = (result.rows.reduce((acc, cur) => acc.stars + cur.stars, 0)) / result.rows.length
    return {stars: Math.round(averageStars), reviewCount: result.rows.length};
}

/**
 * Gets the movie id and returns the average stars and review count.
 * 
 * @param {number} id The id of the movie to get the rating of
 * @returns {object} An object containing two variables - stars and reviewCount
 */
export async function getMovieStarRating(id) {
    // Get the movie title from the API
    const result = await getMovieData(id);

    // Get the rating by title (Yes, thats the only way we can do it)
    const movieRating = await getMovieStarRatingByTitle(result.data.data.original_title);

    // Return the data
    return movieRating;
}

/**
 * Takes a movie title and returns all of the reviews about it
 * @param {string} title The title of the movie to get reviews about
 * @returns {Promise<Array<object>>} The array of all of the reviews as objects
 */
export async function getMovieReviews(title) {
    // Get the reviews from the database
    const result = await db.query("SELECT * FROM post WHERE movie=$1;", [title.toLowerCase()]);
    return result.rows;
}

// The object for all of these functions
const moviedata = {
    getMovieData, 
    getByTitle, 
    getAutocompleteMovie, 
    getMovieStarRating, 
    getMovieStarRatingByTitle,
    getMovieReviews,
};
export default moviedata;
import NotFoundError from '../errors/not-found.error.js'
import { toNativeTypes } from '../utils.js'

// TODO: Import the `int` function from neo4j-driver

import { goodfellas, popular } from '../../test/fixtures/movies.js'
import { int } from 'neo4j-driver'

export default class FavoriteService {
  /**
   * @type {neo4j.Driver}
   */
  driver

  /**
  * The constructor expects an instance of the Neo4j Driver, which will be
  * used to interact with Neo4j.
  *
  * @param {neo4j.Driver} driver
  */
  constructor(driver) {
    this.driver = driver
  }

  /**
   * @public
   * This method should retrieve a list of movies that have an incoming :HAS_FAVORITE
   * relationship from a User node with the supplied `userId`.
   *
   * Results should be ordered by the `sort` parameter, and in the direction specified
   * in the `order` parameter.
   * Results should be limited to the number passed as `limit`.
   * The `skip` variable should be used to skip a certain number of rows.
   *
   * @param {string} userId  The unique ID of the user
   * @param {string} sort The property to order the results by
   * @param {string} order The direction in which to order
   * @param {number} limit The total number of rows to return
   * @param {number} skip The nuber of rows to skip
   * @returns {Promise<Record<string, any>[]>}  An array of Movie objects
   */
  // tag::all[]
  async all(userId, sort = 'title', order = 'ASC', limit = 6, skip = 0) {
    // Open a new session
    const session = this.driver.session()
    
    // Retrieve a list of movies favorited by the user
    const listFavoritesQuery = `
      MATCH (u:User{userId:$userId})-[f:HAS_FAVOURITE]->(m:Movie)
      RETURN m {.*, favorite: true} AS movie
      ORDER BY m.\`${sort}\` ${order}
      SKIP $skip
      LIMIT $limit
      `
      
    const res = await session.executeWrite(tx => tx.run(listFavoritesQuery, {userId, skip:int(skip), limit:int(limit)}))
    
    // Close session
    await session.close()
    if (res.records.length === 0) {
      throw new NotFoundError('Unable to list favorites')
    }
    
    const movies = res.records.map(record => toNativeTypes(record.get('movie')))
      

    return movies
  }
  // end::all[]

  /**
   * @public
   * This method should create a `:HAS_FAVORITE` relationship between
   * the User and Movie ID nodes provided.
   *
   * If either the user or movie cannot be found, a `NotFoundError` should be thrown.
   *
   * @param {string} userId The unique ID for the User node
   * @param {string} movieId The unique tmdbId for the Movie node
   * @returns {Promise<string, any>} The updated movie record with `favorite` set to true
   */
  // tag::add[]
  async add(userId, movieId) {
    // Open a new Session
    const session = this.driver.session()
    
    // Create HAS_FAVORITE relationship within a Write Transaction
    const addFavouriteQuery = `
    MATCH (u:User{userId:$userId}), (m:Movie{tmdbId:$movieId})
    MERGE (u)-[f:HAS_FAVOURITE]->(m)
    ON CREATE SET f.createdAt = datetime()
    RETURN m {.*, favorite: true} AS movie
    `
    const res = await session.executeWrite((tx) => tx.run(addFavouriteQuery, { userId, movieId }))
    // Close the session
    await session.close()
    
    if (res.records.length === 0) {
      throw new NotFoundError('Unable to add favorite')
    }
    
    // Return movie details and `favorite` property
    const movie = res.records[0].get('movie')

    return toNativeTypes(movie)
  }
  // end::add[]

  /**
   * @public
   * This method should remove the `:HAS_FAVORITE` relationship between
   * the User and Movie ID nodes provided.
   *
   * If either the user, movie or the relationship between them cannot be found,
   * a `NotFoundError` should be thrown.
   *
   * @param {string} userId The unique ID for the User node
   * @param {string} movieId The unique tmdbId for the Movie node
   * @returns {Promise<string, any>} The updated movie record with `favorite` set to true
   */
  // tag::remove[]
  async remove(userId, movieId) {
    // Open a new Session
    const session = this.driver.session()
    
    // Delete the HAS_FAVORITE relationship within a Write Transaction
    const removeFavouriteQuery = `
    MATCH (u:User{userId:$userId}), (m:Movie{tmdbId:$movieId})
    MATCH (u)-[f:HAS_FAVOURITE]->(m)
    DELETE f
    RETURN m {.*, favorite: false} AS movie
    `
    const res = await session.executeWrite((tx) => tx.run(removeFavouriteQuery, { userId, movieId }))
    // Close the session
    await session.close()
    
    if (res.records.length === 0) {
      throw new NotFoundError('Unable to remove favorite')
    }
    
    // Return movie details and `favorite` property
    const movie = res.records[0].get('movie')

    return toNativeTypes(movie)
  }
  // end::remove[]

}

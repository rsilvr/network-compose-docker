const uuid = require('uuid')
const express = require('express')
const bodyParser = require('body-parser')
const { graphqlExpress, graphiqlExpress } = require('apollo-server-express')
const { makeExecutableSchema } = require('graphql-tools')
const depthLimit = require('graphql-depth-limit')
const costAnalysis = require('graphql-cost-analysis').default

const {MongoClient} = require('mongodb')
const dbUrl = 'mongodb://localhost:27017/'
let hackerNewsDb, linksCollection, usersCollection
MongoClient.connect(dbUrl)
.then(dbObj => {
  hackerNewsDb = dbObj.db('hackernews')
  linksCollection = hackerNewsDb.collection('link')
  usersCollection = hackerNewsDb.collection('user')
  return restartDB()
})
.then(() => console.log('Database connected'))

const restartDB = async () => {
  await linksCollection.deleteMany({})
  await usersCollection.deleteMany({})
  return insertUsers()
}

const extractSingleResult = results => results.length > 0 ? results[0] : null

const insertUsers = () => {
  const bob = {id: uuid(), name: 'Bob', email: 'bob@gmail.com', links: []}
  const alice = {id: uuid(), name: 'Alice', email: 'alice@gmail.com', links: []}
  return usersCollection.insertMany([bob, alice])
  .then(() => insertLink('www.myblog.com', 'My personal blog', bob.id))
  .then(() => insertLink('www.github.com/bob', 'My github profile', bob.id))
  .then(() => insertLink('www.w3schools.com', 'My reference site', alice.id))
}

const findUser = id => usersCollection.findOne({id}).toArray().then(extractSingleResult)

const findAllUsers = () => usersCollection.find({}).toArray()

const insertLink = (url, description, postedBy) => {
  const link = {url, description, id: uuid(), postedBy}
  let res
  return linksCollection.insertOne(link).then(results => results.ops[0])
}

const getLink = id => {
  const query = {id}
  return linksCollection.find(query).toArray()
  .then(extractSingleResult)
}

const findLinksByUser = userId => {
  const query = {postedBy: userId}
  return linksCollection.find(query).toArray()
}

const findAllLinks = () => linksCollection.find({}).toArray()

const getAuthenticatedUser = async context => {
  const notAuthenticatedError = new Error('User not authenticated')
  const id = context.headers.authorization
  if(id) {
    const user = await findUser(id)
    if(!user) throw notAuthenticatedError
    return user
  }
  throw notAuthenticatedError
}

const typeDefs = require('./schema')

const resolvers = {
  Query: {
    info: () => "Minha API",
    feed: () => findAllLinks(),
    getLink: (parent, args, context) => getLink(args.id),
    findUsers: () => findAllUsers(),
    getUser: (parent, args, context) => findUser(args.id)
  },
  Mutation: {
    post: async (parent, args, context) => {
      const user = await getAuthenticatedUser(context)
      const {url, description} = args
      return insertLink(url, description, user)
    } 
  },
  User: {
    links: (parent, args, context) => {
      return findLinksByUser(parent.id)
    }
  },
  Link: {
    postedBy: (parent, args, context) => {
      return findUser(parent.postedBy)
    }
  }
}

const schema = makeExecutableSchema({
  typeDefs,
  resolvers,
})

const app = express()

app.use('/graphql', bodyParser.json(), graphqlExpress(req => ({
  schema,
  context: req,
  validationRules: [depthLimit(4), costAnalysis({variables: req.body.variables, maximumCost: 100, onComplete: cost => {console.log(cost)}})]
})))

app.listen(4000)
console.log(`Server is running on http://localhost:4000`)
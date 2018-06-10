const uuid = require('uuid')
const express = require('express')
const graphqlHTTP = require('express-graphql')
const {buildSchema} = require('graphql')
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
  .then(() => insertLink('www.myblog.com', 'My personal blog', bob))
  .then(() => insertLink('www.github.com/bob', 'My github profile', bob))
  .then(() => insertLink('www.w3schools.com', 'My reference site', alice))
}

const findUser = id => usersCollection.find({id}).toArray().then(extractSingleResult)

const updateUser = (id, link) => {
  return findUser(id)
  .then(user => {
    usersCollection.updateOne({id}, {$set: {links: [...user.links, link]}})
  })
}

const findAllUsers = () => usersCollection.find({}).toArray()

const insertLink = (url, description, postedBy) => {
  const link = {url, description, id: uuid(), postedBy}
  let res
  return linksCollection.insertOne(link).then(results => res = results.ops[0])
  .then(() => updateUser(postedBy.id, link)).then(() => res)
}

const findLink = id => {
  const query = {id}
  return linksCollection.find(query).toArray()
  .then(extractSingleResult)
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


const rootValue = {
  info: () => "Minha API",
  feed: () => findAllLinks(),
  getLink: (args, context) => findLink(args.id),
  findUsers: () => findAllUsers(),
  getUser: (args, context) => findUser(args.id),
  post: async (args, context) => {
    const user = await getAuthenticatedUser(context)
    const {url, description} = args
    return insertLink(url, description, user)
  } 
}

const server = graphqlHTTP((req, res, graphQLParams) => ({
  schema: buildSchema(require('./schema')),
  rootValue,
  graphiql: true,
  validationRules: [depthLimit(4), costAnalysis({variables: graphQLParams.variables, maximumCost: 100, onComplete: cost => {console.log(cost)}})]
}))

const app = express()
app.use('/graphql', server)
app.listen(4000)
console.log(`Server is running on http://localhost:4000`)
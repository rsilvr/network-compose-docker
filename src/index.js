const express = require('express')
const graphqlHTTP = require('express-graphql')
const {buildSchema} = require('graphql')
const depthLimit = require('graphql-depth-limit')

const {MongoClient} = require('mongodb')
const dbUrl = 'mongodb://localhost:27017/'
let hackerNewsDb, linksCollection, usersCollection
MongoClient.connect(dbUrl)
.then(dbObj => {
  hackerNewsDb = dbObj.db('hackernews')
  linksCollection = hackerNewsDb.collection('link')
  usersCollection = hackerNewsDb.collection('user')
  // return restartDB()
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
  .then(() => insertLink('www.myblog.com', 'My personal Blog', bob))
  .then(() => insertLink('www.myrecipes.com', 'My recipes Site', alice))
}

const findUser = id => usersCollection.find({id}).toArray().then(extractSingleResult)

const updateUser = (id, link) => {
  return findUser(id)
  .then(user => usersCollection.updateOne({id}, {$set: {links: [...user.links, link]}}))
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
  const id = context.request && context.request.get('Authorization')
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
  link: (root, args) => findLink(args.id),
  users: () => findAllUsers(),
  user: (root, args) => findUser(args.id),
  post: async (root, args, context) => {
    const user = await getAuthenticatedUser(context)
    const {url, description} = args
    return insertLink(url, description, user)
  } 
}

const server = graphqlHTTP({
  schema: buildSchema(require('./schema')),
  rootValue,
  graphiql: true,
  validationRules: [ depthLimit(4) ]
})

const app = express()
app.use('/graphql', server)
app.listen(4000)
console.log(`Server is running on http://localhost:4000`)
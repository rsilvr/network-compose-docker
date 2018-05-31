const {GraphQLServer} = require('graphql-yoga')
const uuid = require('uuid').v4

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

const restartDB = () => {
  linksCollection.deleteMany({})
  usersCollection.deleteMany({})
  return insertUsers()
}

const extractSingleResult = results => results.length > 0 ? results[0] : {}

const typeDefs = './src/schema.graphql'

const insertUsers = () => {
  const bob = {id: uuid(), name: 'Bob', email: 'bob@gmail.com', links: []}
  const alice = {id: uuid(), name: 'Alice', email: 'alice@gmail.com', links: []}
  return usersCollection.insertMany([bob, alice])
  .then(() => insertLink('www.myblog.com', 'My personal Blog', bob).then(link => updateUser(bob.id, link)))
  .then(() => insertLink('www.myrecipes.com', 'My recipes Site', alice).then(link => updateUser(alice.id, link)))
}

const findUser = id => usersCollection.find({id}).toArray().then(extractSingleResult)

const updateUser = (id, link) => {
  return findUser(id)
  .then(user => usersCollection.updateOne({id}, {$set: {links: [...user.links, link]}}))
}

const findAllUsers = () => usersCollection.find({}).toArray()

const insertLink = (url, description, postedBy) => {
  const link = {url, description, id: uuid(), postedBy}
  return linksCollection.insertOne(link).then(results => results.ops[0])
}

const findLink = id => {
  const query = {id}
  return linksCollection.find(query).toArray()
  .then(extractSingleResult)
}

const findAllLinks = () => linksCollection.find({}).toArray()

const resolvers = {
  Query: {
    info: () => null,
    feed: () => findAllLinks(),
    link: (root, args) => findLink(args.id),
    users: () => findAllUsers()
  },
  Mutation: {
    post: (root, args) => {
      const {url, description} = args
      return insertLink(url, description)
    }
  }
}

const server = new GraphQLServer({
  typeDefs,
  resolvers,
})

server.start(() => console.log(`Server is running on http://localhost:4000`))
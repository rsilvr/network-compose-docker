const { GraphQLServer } = require('graphql-yoga')

const typeDefs = './src/schema.graphql'

let links = [{
  id: new Date().valueOf().toString(),
  url: 'www.howtographql.com',
  description: 'Fullstack tutorial for GraphQL'
}]

const resolvers = {
  Query: {
    info: () => null,
    feed: () => links,
    link: id => links.find(l => l.id === id)
  },
  Mutation: {
    post: (root, args) => {
      const {url, description} = args
      const link = {url, description, id: new Date().valueOf().toString()}
      links.push(link)
      return link
    },
    update: (root, args) => {
      const {url, description, id} = args
      links = links.map(l => l.id === id ? {url, description, id} : l)
    },
    delete: (root, args) => {
      const {id} = args
      links = links.filter(l => l.id !== id)
    }
  }
}

const server = new GraphQLServer({
  typeDefs,
  resolvers,
})

server.start(() => console.log(`Server is running on http://localhost:4000`))
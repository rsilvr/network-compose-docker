module.exports =
`
type Query {
  info: String!
  feed: [Link!]!
  findUsers: [User]!
  getLink(id: ID!): Link
  getUser(id: ID!): User
}

type Mutation {
  post(url: String!, description: String!): Link!
}

type Link {
  id: ID
  description: String
  url: String
  postedBy: User
}

type User {
  id: ID!
  name: String!
  email: String!
  links: [Link!]!
}
`
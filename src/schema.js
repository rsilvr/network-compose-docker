module.exports =
`
type Query {
  info: String!
  feed(limit: Int = 5): [Link!]! @cost(complexity: 2, useMultipliers: true, multipliers: ["limit"])
  findUsers(limit: Int = 5): [User]! @cost(complexity: 3, useMultipliers: true, multipliers: ["limit"])
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
  links(limit: Int = 3): [Link!]! @cost(complexity: 5, useMultipliers: true, multipliers: ["limit"])
}
`
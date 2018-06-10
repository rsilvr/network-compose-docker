module.exports =
`
type Pagination {
  min: Int
  max: Int
}
type Query {
  info: String!
  feed(quantity: Pagination): [Link!]!
  users: [User]!
  link(id: ID!): Link
  user(id: ID!): User
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
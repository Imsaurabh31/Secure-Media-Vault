import { createYoga } from 'graphql-yoga';
import { createServer } from 'http';
import { buildSchema } from 'graphql';
import { typeDefs } from './schema.js';

// Simple schema without authentication
const simpleTypeDefs = `
  type Asset {
    id: ID!
    filename: String!
    mime: String!
    size: Int!
    status: String!
    version: Int!
    createdAt: String!
  }

  type Query {
    myAssets: [Asset!]!
    hello: String!
  }
`;

// Demo data
const demoAssets = [
  {
    id: 'demo-1',
    filename: 'sample-image.jpg',
    mime: 'image/jpeg',
    size: 1024000,
    status: 'ready',
    version: 1,
    createdAt: new Date().toISOString()
  },
  {
    id: 'demo-2', 
    filename: 'document.pdf',
    mime: 'application/pdf',
    size: 2048000,
    status: 'ready',
    version: 1,
    createdAt: new Date().toISOString()
  }
];

const resolvers = {
  Query: {
    myAssets: () => demoAssets,
    hello: () => 'Hello from Secure Media Vault GraphQL API!'
  }
};

const yoga = createYoga({
  schema: buildSchema(simpleTypeDefs),
  resolvers,
  cors: { origin: '*', credentials: true },
  graphiql: true
});

const server = createServer(yoga);
server.listen(4000, () => {
  console.log('🚀 Demo GraphQL server running on http://localhost:4000/graphql');
});